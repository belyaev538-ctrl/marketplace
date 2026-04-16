import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildCatalogProductWhere,
  resolveCatalogCategoryIds,
} from "@/lib/catalog-products-query";
import {
  catalogProductOrderBy,
  mergeCatalogPriceIntoWhere,
  parseCatalogPriceParams,
} from "@/lib/catalog-list-query";
import { filterByRadiusKm } from "@/lib/geo-distance";
import { parseStoreBusinessTypesFromQueryStrings } from "@/lib/store-business-type";
import { catalogListableStoreWithCoordsWhere } from "@/lib/catalog-products-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resultMode = (searchParams.get("result") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim();
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10) || 25)
  );
  const categoryRaw = searchParams.get("category");
  const storeRaw = searchParams.get("store");
  const fulfillmentModes = searchParams.getAll("fulfillment");
  const businessTypesFilter = parseStoreBusinessTypesFromQueryStrings(
    searchParams.getAll("businessTypes"),
  );
  const categoryId =
    categoryRaw && categoryRaw.trim() !== "" ? categoryRaw : undefined;
  const storeSlug = storeRaw && storeRaw.trim() !== "" ? storeRaw : undefined;

  const minPriceRaw = searchParams.get("minPrice") ?? undefined;
  const maxPriceRaw = searchParams.get("maxPrice") ?? undefined;
  const sortRaw = searchParams.get("sort") ?? undefined;
  const { minPrice, maxPrice } = parseCatalogPriceParams(minPriceRaw, maxPriceRaw);
  const orderBy = catalogProductOrderBy(sortRaw ?? undefined);
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const radiusRaw = searchParams.get("radiusKm");
  const lat = latRaw != null ? Number.parseFloat(latRaw) : NaN;
  const lng = lngRaw != null ? Number.parseFloat(lngRaw) : NaN;
  const radiusKm = radiusRaw != null ? Number.parseFloat(radiusRaw) : NaN;
  const categoryIds = await resolveCatalogCategoryIds(categoryId);
  const baseWhere = buildCatalogProductWhere(
    storeSlug,
    categoryIds,
    fulfillmentModes,
    businessTypesFilter,
  );
  const where = mergeCatalogPriceIntoWhere(baseWhere, minPrice, maxPrice) as Record<string, unknown>;
  if (q.length > 0) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0) {
    const storesWithCoords = await prisma.store.findMany({
      where: catalogListableStoreWithCoordsWhere(),
      select: { id: true, latitude: true, longitude: true },
    });
    const inRadiusStoreIds = filterByRadiusKm(
      storesWithCoords
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.id,
          latitude: s.latitude as number,
          longitude: s.longitude as number,
        })),
      { lat, lng },
      radiusKm,
    ).map((s) => s.id);
    where.storeId = { in: inRadiusStoreIds };
  }

  if (resultMode === "storeSlugs") {
    const storeIds = await prisma.product.findMany({
      where,
      distinct: ["storeId"],
      select: { storeId: true },
    });
    if (storeIds.length === 0) {
      return NextResponse.json({ storeSlugs: [] as string[] });
    }
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds.map((row) => row.storeId) } },
      select: { slug: true },
    });
    const storeSlugs = Array.from(
      new Set(
        stores
          .map((s) => s.slug?.trim() || "")
          .filter((slug) => slug.length > 0),
      ),
    );
    return NextResponse.json({ storeSlugs });
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: {
          take: 1,
          select: { url: true },
        },
        store: { select: { slug: true, name: true, logo: true, fulfillmentModes: true } },
      },
      take: limit,
      skip: offset,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  const items = products.map((p) => {
    const slug = (p.slug ?? "").trim();
    return {
      id: p.id,
      slug: slug === "" ? null : slug,
      storeSlug: p.store.slug?.trim() || null,
      name: p.name,
      price: p.price,
      imageUrl: p.images[0]?.url ?? null,
      storeName: p.store.name,
      storeLogoUrl: p.store.logo?.trim() || null,
      fulfillmentModes: p.store.fulfillmentModes,
    };
  });

  const hasMore = offset + items.length < total;

  return NextResponse.json({
    items,
    offset,
    limit,
    hasMore,
    total,
  });
}
