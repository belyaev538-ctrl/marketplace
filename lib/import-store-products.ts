import { ImportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createUniqueProductSlug } from "@/lib/product-slug";
import { refreshProductSearchVector } from "@/lib/product-search-vector";
import { XMLParser } from "fast-xml-parser";

type RawOffer = Record<string, unknown>;

const MAX_IMAGES = 5;

function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null && "#text" in (v as object)) {
    return String((v as RawOffer)["#text"]);
  }
  return String(v);
}

function parsePrice(v: unknown): number {
  const n = parseFloat(text(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function parseOptionalPrice(v: unknown): number | null {
  if (v == null) return null;
  const s = text(v).trim();
  if (!s) return null;
  const n = parseFloat(s.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

/** YML offer @available — по умолчанию true */
function parseAvailability(offer: RawOffer): boolean {
  const v = offer["@_available"];
  if (v === undefined || v === null) return true;
  const s = String(v).toLowerCase();
  return s !== "false" && s !== "0" && s !== "no";
}

function normalizeOffers(raw: unknown): RawOffer[] {
  return asArray(raw as RawOffer | RawOffer[]);
}

function extractCategoryNodes(doc: unknown): RawOffer[] {
  const root = doc as RawOffer;
  const shop = (root.yml_catalog as RawOffer | undefined)?.shop as RawOffer | undefined;
  const categories = shop?.categories as RawOffer | undefined;
  if (categories?.category == null) return [];
  return asArray(categories.category as RawOffer | RawOffer[]);
}

function extractOfferNodes(doc: unknown): RawOffer[] {
  const root = doc as RawOffer;

  const yml = root.yml_catalog as RawOffer | undefined;
  const shop = yml?.shop as RawOffer | undefined;
  const ymlOffers = shop?.offers as RawOffer | undefined;
  if (ymlOffers?.offer != null) {
    return normalizeOffers(ymlOffers.offer);
  }

  const offers = root.offers as RawOffer | undefined;
  if (offers?.offer != null) {
    return normalizeOffers(offers.offer);
  }

  return [];
}

async function importSourceCategories(
  storeId: string,
  doc: unknown
): Promise<Map<string, string>> {
  const idByExternal = new Map<string, string>();
  const nodes = extractCategoryNodes(doc);

  for (const node of nodes) {
    const externalId = text(node["@_id"] ?? node.id).trim();
    const name = text(node).trim();
    if (!externalId || !name) continue;

    const parentRaw = text(node["@_parentId"] ?? node.parentId).trim();
    const parentId = parentRaw.length > 0 ? parentRaw : null;

    const row = await prisma.sourceCategory.upsert({
      where: {
        storeId_externalId: { storeId, externalId },
      },
      create: {
        storeId,
        externalId,
        name,
        parentId,
      },
      update: {
        name,
        parentId,
      },
    });
    idByExternal.set(externalId, row.id);
  }

  return idByExternal;
}

async function ensureSourceCategory(
  storeId: string,
  externalId: string,
  nameFallback: string
): Promise<string> {
  const existing = await prisma.sourceCategory.findFirst({
    where: { storeId, externalId },
  });
  if (existing) return existing.id;

  const created = await prisma.sourceCategory.create({
    data: {
      storeId,
      externalId,
      name: nameFallback.trim() || externalId,
      parentId: null,
    },
  });
  return created.id;
}

async function resolveSourceCategoryId(
  storeId: string,
  categoryExtId: string,
  categoryIdByExternal: Map<string, string>,
  productName: string
): Promise<string | null> {
  if (!categoryExtId) return null;
  let id = categoryIdByExternal.get(categoryExtId) ?? null;
  if (!id) {
    id = await ensureSourceCategory(storeId, categoryExtId, productName);
    categoryIdByExternal.set(categoryExtId, id);
  }
  return id;
}

async function replaceProductImages(productId: string, urls: string[]) {
  const existing = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true },
  });
  for (const { id } of existing) {
    await prisma.productImage.delete({ where: { id } });
  }

  const slice = urls.slice(0, MAX_IMAGES);
  if (slice.length === 0) return;

  await prisma.productImage.createMany({
    data: slice.map((url) => ({ productId, url })),
  });
}

function toRow(offer: RawOffer) {
  const externalId = text(offer["@_id"] ?? offer.id).trim();
  const name = text(offer.name).trim();
  const price = parsePrice(offer.price);
  const oldPrice = parseOptionalPrice(offer.oldprice ?? offer.oldPrice);
  const urlRaw = text(offer.url).trim();
  const externalUrl = urlRaw.length > 0 ? urlRaw : null;
  const descRaw = text(offer.description).trim();
  const description = descRaw.length > 0 ? descRaw : null;
  const categoryExtId = text(offer["@_categoryId"] ?? offer.categoryId).trim();
  const availability = parseAvailability(offer);
  const pictures = asArray(offer.picture as RawOffer | RawOffer[] | string | undefined | null)
    .map((p) => text(p).trim())
    .filter((url) => url.length > 0);

  return {
    externalId,
    name,
    price,
    oldPrice,
    externalUrl,
    description,
    categoryExtId,
    availability,
    pictures,
  };
}

function truncateErr(msg: string, max = 4000): string {
  const s = msg.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

async function recordImportFailure(storeId: string, message: string) {
  const storeExists = await prisma.store.findFirst({
    where: { id: storeId },
    select: { id: true },
  });
  if (!storeExists) return;

  try {
    await prisma.importLog.create({
      data: { storeId, status: "failed", message },
    });
  } catch {
    /* ignore */
  }
  try {
    await prisma.store.update({
      where: { id: storeId },
      data: {
        lastImportStatus: ImportStatus.failed,
        lastImportError: truncateErr(message),
      },
    });
  } catch {
    /* ignore */
  }
}

async function updateStoreLastImportFailed(storeId: string, message?: string) {
  const storeExists = await prisma.store.findFirst({
    where: { id: storeId },
    select: { id: true },
  });
  if (!storeExists) return;
  try {
    await prisma.store.update({
      where: { id: storeId },
      data: {
        lastImportStatus: ImportStatus.failed,
        lastImportError: truncateErr((message ?? "").trim() || "Импорт не завершён"),
      },
    });
  } catch {
    /* ignore */
  }
}

export type ImportStoreProductsOptions = {
  /** Не писать в ImportLog (очередь пишет одну запись на job). Метаданные Store обновляются как обычно. */
  skipImportLog?: boolean;
};

export async function importStoreProducts(
  storeId: string,
  options?: ImportStoreProductsOptions
) {
  const skipImportLog = options?.skipImportLog ?? false;
  try {
    const store = await prisma.store.findFirst({ where: { id: storeId } });
    if (!store) {
      throw new Error("Store not found");
    }

    const xmlUrl = store.xmlUrl?.trim();
    if (!xmlUrl) {
      throw new Error("XML URL не задан");
    }

    const res = await fetch(xmlUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch XML: ${res.status}`);
    }

    const xml = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      // Большие YML с множеством &...; в текстах превышают дефолтный лимит 1000 раскрытий сущностей fast-xml-parser.
      processEntities: {
        enabled: true,
        maxTotalExpansions: 5_000_000,
      },
    });
    const doc = parser.parse(xml);

    const categoryIdByExternal = await importSourceCategories(storeId, doc);
    const offerNodes = extractOfferNodes(doc);
    const seenExternalIds = new Set<string>();

    for (const node of offerNodes) {
      const row = toRow(node);
      if (!row.externalId || !row.name) continue;

      seenExternalIds.add(row.externalId);

      const sourceCategoryId = await resolveSourceCategoryId(
        storeId,
        row.categoryExtId,
        categoryIdByExternal,
        row.name
      );

      const existing = await prisma.product.findFirst({
        where: {
          storeId,
          externalId: row.externalId,
        },
        select: { id: true, slug: true },
      });

      const baseData = {
        name: row.name,
        price: row.price,
        oldPrice: row.oldPrice,
        description: row.description,
        externalUrl: row.externalUrl,
        availability: row.availability,
        sourceCategoryId,
        active: true,
      };

      let productId: string;
      if (existing) {
        // Публичный каталог и ссылки на товар требуют непустой slug; при импорте всегда задаём уникальный slug.
        const slugPatch =
          !existing.slug?.trim()
            ? {
                slug: await createUniqueProductSlug(row.name, {
                  excludeProductId: existing.id,
                }),
              }
            : {};
        await prisma.product.update({
          where: { id: existing.id },
          data: { ...baseData, ...slugPatch },
        });
        productId = existing.id;
      } else {
        const slug = await createUniqueProductSlug(row.name);
        const created = await prisma.product.create({
          data: {
            storeId,
            externalId: row.externalId,
            slug,
            ...baseData,
          },
        });
        productId = created.id;
      }

      await refreshProductSearchVector(productId);
      await replaceProductImages(productId, row.pictures);
    }

    if (seenExternalIds.size > 0) {
      await prisma.product.updateMany({
        where: {
          storeId,
          externalId: { notIn: Array.from(seenExternalIds) },
        },
        data: { active: false },
      });
    }

    await prisma.store.update({
      where: { id: storeId },
      data: {
        lastImportAt: new Date(),
        lastImportStatus: ImportStatus.success,
        lastImportError: null,
      },
    });

    if (!skipImportLog) {
      await prisma.importLog.create({
        data: {
          storeId,
          status: "success",
          message: "Import completed",
        },
      });
    }
  } catch (e) {
    const message = String(e);
    if (skipImportLog) {
      await updateStoreLastImportFailed(storeId, message);
    } else {
      await recordImportFailure(storeId, message);
    }
    throw e;
  }
}
