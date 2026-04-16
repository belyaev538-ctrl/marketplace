import type { Prisma } from "@prisma/client";

export const CATALOG_SORT_VALUES = [
  "new",
  "price_asc",
  "price_desc",
  "name_asc",
] as const;

export type CatalogSortValue = (typeof CATALOG_SORT_VALUES)[number];

function parseOptionalPrice(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function parseCatalogPriceParams(
  minRaw: string | undefined,
  maxRaw: string | undefined,
): { minPrice?: number; maxPrice?: number } {
  const minPrice = parseOptionalPrice(minRaw);
  const maxPrice = parseOptionalPrice(maxRaw);
  return { minPrice, maxPrice };
}

/** Добавляет фильтр по цене к условию каталога (без изменения остальных полей). */
export function mergeCatalogPriceIntoWhere(
  where: Prisma.ProductWhereInput,
  minPrice?: number,
  maxPrice?: number,
): Prisma.ProductWhereInput {
  if (minPrice == null && maxPrice == null) return where;
  const price: Prisma.FloatFilter = {};
  if (minPrice != null) price.gte = minPrice;
  if (maxPrice != null) price.lte = maxPrice;
  return { ...where, price };
}

export function catalogProductOrderBy(
  sortRaw: string | undefined,
): Prisma.ProductOrderByWithRelationInput {
  switch (sortRaw) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "name_asc":
      return { name: "asc" };
    case "new":
    default:
      return { createdAt: "desc" };
  }
}

export function normalizeCatalogSort(
  raw: string | undefined,
): CatalogSortValue {
  if (
    raw === "price_asc" ||
    raw === "price_desc" ||
    raw === "name_asc" ||
    raw === "new"
  ) {
    return raw;
  }
  return "new";
}

export type CatalogListQueryPreserved = {
  store?: string;
  /** Только для `/catalog` с `?category=` */
  category?: string;
  q?: string;
  /** Форматы работы магазина: repeated `fulfillment=` */
  fulfillment?: string[];
  /** Типы магазина: repeated `businessTypes=` */
  businessTypes?: string[];
  lat?: string;
  lng?: string;
  radiusKm?: string;
};

/** Query-string для списка товаров (каталог / категория). */
export function buildCatalogListQueryString(opts: {
  preserved: CatalogListQueryPreserved;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  /** Если не передать — offset в URL не ставим (сброс пагинации). */
  offset?: number;
}): string {
  const qs = new URLSearchParams();
  if (opts.preserved.store) qs.set("store", opts.preserved.store);
  if (opts.preserved.category) qs.set("category", opts.preserved.category);
  if (opts.preserved.q) qs.set("q", opts.preserved.q);
  if (opts.preserved.lat) qs.set("lat", opts.preserved.lat);
  if (opts.preserved.lng) qs.set("lng", opts.preserved.lng);
  if (opts.preserved.radiusKm) qs.set("radiusKm", opts.preserved.radiusKm);
  for (const f of opts.preserved.fulfillment ?? []) {
    const v = f.trim();
    if (v) qs.append("fulfillment", v);
  }
  for (const b of opts.preserved.businessTypes ?? []) {
    const v = b.trim();
    if (v) qs.append("businessTypes", v);
  }
  const minT = (opts.minPrice ?? "").trim();
  const maxT = (opts.maxPrice ?? "").trim();
  if (minT !== "") qs.set("minPrice", minT);
  if (maxT !== "") qs.set("maxPrice", maxT);
  qs.set("sort", normalizeCatalogSort(opts.sort));
  if (opts.offset != null && opts.offset > 0) {
    qs.set("offset", String(opts.offset));
  }
  return qs.toString();
}

/** «1 343 товара» для строки над сеткой. */
export function formatCatalogProductCount(total: number): string {
  const n = Math.max(0, Math.floor(total));
  const formatted = n.toLocaleString("ru-RU");
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word: string;
  if (mod100 >= 11 && mod100 <= 14) {
    word = "товаров";
  } else if (mod10 === 1) {
    word = "товар";
  } else if (mod10 >= 2 && mod10 <= 4) {
    word = "товара";
  } else {
    word = "товаров";
  }
  return `${formatted} ${word}`;
}
