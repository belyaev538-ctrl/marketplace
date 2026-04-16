import { Prisma } from "@prisma/client";
import { parseStoreBusinessTypesFromQueryStrings } from "@/lib/store-business-type";
import {
  fulfillmentModesForPublicListing,
  parsePublicFulfillmentFilters,
  sqlStoreFulfillmentAndClause,
} from "@/lib/catalog-fulfillment-filter";
import { normalizeCatalogSort, parseCatalogPriceParams } from "@/lib/catalog-list-query";
import { filterByRadiusKm } from "@/lib/geo-distance";
import { catalogListableStoreWithCoordsWhere } from "@/lib/catalog-products-query";
import { prisma } from "@/lib/prisma";

export type FtsProductHit = {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  storeName: string;
  storeSlug: string;
  storeLogo: string | null;
  fulfillmentModes: string[];
};

const MIN_QUERY_LEN = 2;
const MAX_LIMIT = 24;

function buildPrefixTsQuery(raw: string): string | null {
  const parts = raw
    .toLocaleLowerCase("ru-RU")
    .split(/[^0-9\p{L}]+/u)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2);
  if (parts.length === 0) return null;
  return parts.map((p) => `${p.replace(/'/g, "")}:*`).join(" & ");
}

/**
 * Полнотекстовый поиск по Product.searchVector (PostgreSQL tsvector + GIN).
 * Без LIKE; plainto_tsquery('simple', …) + ts_rank.
 * Только активные товары и активные магазины; slug непустой — для публичных ссылок.
 */
export async function searchProductsFullText(
  q: string,
  offset: number,
  limit: number,
  args?: {
    fulfillmentModes?: string[];
    minPriceRaw?: string;
    maxPriceRaw?: string;
    sortRaw?: string;
    businessTypesRaw?: string[];
    latRaw?: string;
    lngRaw?: string;
    radiusKmRaw?: string;
  },
): Promise<{ items: FtsProductHit[]; hasMore: boolean; total: number }> {
  const query = q.trim();
  const tsQuery = buildPrefixTsQuery(query);
  if (query.length < MIN_QUERY_LEN) {
    return { items: [], hasMore: false, total: 0 };
  }

  const safeLimit = Math.min(Math.max(1, limit), MAX_LIMIT);
  const safeOffset = Math.max(0, offset);
  const fetchLimit = safeLimit + 1;
  const cleanFulfillment = parsePublicFulfillmentFilters(args?.fulfillmentModes ?? []);
  const { minPrice, maxPrice } = parseCatalogPriceParams(args?.minPriceRaw, args?.maxPriceRaw);
  const sort = normalizeCatalogSort(args?.sortRaw);
  const businessTypes = parseStoreBusinessTypesFromQueryStrings(args?.businessTypesRaw ?? []);
  const lat = Number.parseFloat(args?.latRaw ?? "");
  const lng = Number.parseFloat(args?.lngRaw ?? "");
  const radiusKm = Number.parseFloat(args?.radiusKmRaw ?? "");
  const hasGeoRadius = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0;
  let storeIdsInRadius: string[] | null = null;
  if (hasGeoRadius) {
    const storesWithCoords = await prisma.store.findMany({
      where: catalogListableStoreWithCoordsWhere(),
      select: { id: true, latitude: true, longitude: true },
    });
    storeIdsInRadius = filterByRadiusKm(
      storesWithCoords
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({ id: s.id, latitude: s.latitude as number, longitude: s.longitude as number })),
      { lat, lng },
      radiusKm,
    ).map((s) => s.id);
    if (storeIdsInRadius.length === 0) {
      return { items: [], hasMore: false, total: 0 };
    }
  }
  const fulfillmentWhere =
    cleanFulfillment.length > 0
      ? Prisma.sql`AND ${sqlStoreFulfillmentAndClause("s", cleanFulfillment)}`
      : Prisma.empty;
  const minPriceWhere = minPrice != null ? Prisma.sql`AND p.price >= ${minPrice}` : Prisma.empty;
  const maxPriceWhere = maxPrice != null ? Prisma.sql`AND p.price <= ${maxPrice}` : Prisma.empty;
  const businessTypesWhere =
    businessTypes.length > 0
      ? Prisma.sql`AND s."businessTypes" && ${businessTypes}::"StoreBusinessType"[]`
      : Prisma.empty;
  const geoWhere =
    storeIdsInRadius != null
      ? Prisma.sql`AND p."storeId" IN (${Prisma.join(storeIdsInRadius)})`
      : Prisma.empty;
  const orderBySql =
    sort === "price_asc"
      ? Prisma.sql`p.price ASC, p.id DESC`
      : sort === "price_desc"
        ? Prisma.sql`p.price DESC, p.id DESC`
        : sort === "name_asc"
          ? Prisma.sql`p.name ASC, p.id DESC`
          : Prisma.sql`
              CASE
                WHEN position(lower(${query}) in lower(p.name)) > 0 THEN 2
                WHEN position(lower(${query}) in lower(coalesce(p.description, ''))) > 0 THEN 1
                ELSE 0
              END DESC,
              CASE
                WHEN ${tsQuery != null} AND p."searchVector" IS NOT NULL
                  THEN ts_rank(p."searchVector", to_tsquery('simple', ${tsQuery ?? "placeholder"}))
                ELSE 0
              END DESC,
              p.id DESC
            `;
  const textLikeWhere = Prisma.sql`
    OR position(lower(${query}) in lower(p.name)) > 0
    OR position(lower(${query}) in lower(coalesce(p.description, ''))) > 0
  `;

  const [rows, totalRows] = await Promise.all([
    prisma.$queryRaw<FtsProductHit[]>(
      Prisma.sql`
    SELECT
      p.id,
      p.slug,
      p.name,
      p.price,
      s.name AS "storeName",
      s.slug AS "storeSlug",
      s.logo AS "storeLogo",
      s."fulfillmentModes" AS "fulfillmentModes",
      (
        SELECT pi.url
        FROM "ProductImage" pi
        WHERE pi."productId" = p.id
        ORDER BY pi.id ASC
        LIMIT 1
      ) AS "imageUrl"
    FROM "Product" p
    INNER JOIN "Store" s ON s.id = p."storeId" AND s.active = true AND s."showProducts" = true
    WHERE p.active = true
      AND p.slug IS NOT NULL
      AND TRIM(p.slug) <> ''
      AND EXISTS (
        SELECT 1 FROM "ProductImage" pi
        WHERE pi."productId" = p.id AND pi.url IS NOT NULL AND trim(pi.url) <> ''
      )
      AND (
        (p."searchVector" IS NOT NULL AND ${tsQuery != null} AND p."searchVector" @@ to_tsquery('simple', ${tsQuery ?? ""}))
        ${textLikeWhere}
      )
      ${fulfillmentWhere}
      ${minPriceWhere}
      ${maxPriceWhere}
      ${businessTypesWhere}
      ${geoWhere}
    ORDER BY ${orderBySql}
    OFFSET ${safeOffset}
    LIMIT ${fetchLimit}
    `,
    ),
    prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`
    SELECT COUNT(*)::bigint AS total
    FROM "Product" p
    INNER JOIN "Store" s ON s.id = p."storeId" AND s.active = true AND s."showProducts" = true
    WHERE p.active = true
      AND p.slug IS NOT NULL
      AND TRIM(p.slug) <> ''
      AND EXISTS (
        SELECT 1 FROM "ProductImage" pi
        WHERE pi."productId" = p.id AND pi.url IS NOT NULL AND trim(pi.url) <> ''
      )
      AND (
        (p."searchVector" IS NOT NULL AND ${tsQuery != null} AND p."searchVector" @@ to_tsquery('simple', ${tsQuery ?? ""}))
        ${textLikeWhere}
      )
      ${fulfillmentWhere}
      ${minPriceWhere}
      ${maxPriceWhere}
      ${businessTypesWhere}
      ${geoWhere}
    `,
    ),
  ]);

  const hasMore = rows.length > safeLimit;
  const slice = hasMore ? rows.slice(0, safeLimit) : rows;
  const items = slice.map((r) => ({
    ...r,
    slug: (r.slug ?? "").trim(),
    storeSlug: (r.storeSlug ?? "").trim(),
    fulfillmentModes: fulfillmentModesForPublicListing(
      (r.fulfillmentModes ?? []) as ("delivery" | "pickup" | "both" | "offline")[],
    ),
  }));
  const total = Number(totalRows[0]?.total ?? 0n);
  return { items, hasMore, total };
}
