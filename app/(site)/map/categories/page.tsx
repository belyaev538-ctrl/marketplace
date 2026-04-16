import type { StoreBusinessType } from "@prisma/client";
import { catalogProductOrderBy, normalizeCatalogSort } from "@/lib/catalog-list-query";
import { buildCatalogProductWhere, resolveCatalogCategoryIds } from "@/lib/catalog-products-query";
import { filterByRadiusKm } from "@/lib/geo-distance";
import { searchProductsFullText } from "@/lib/product-search-fts";
import { MapCategoriesPageClient } from "@/components/map/map-categories-page-client";
import { catalogListableStoreWithCoordsWhere } from "@/lib/catalog-products-query";
import {
  getHomeMarketplaceCategoriesWithCounts,
  getMarketplaceChildCategoriesWithCountsByParentSlug,
} from "@/lib/marketplace-catalog-categories";
import { prisma } from "@/lib/prisma";
import { firstSearchParam } from "@/lib/search-params";
import {
  buildStoreBusinessTypeTilesForMap,
  parseStoreBusinessTypesFromQueryStrings,
  storeBusinessTypeLabel,
} from "@/lib/store-business-type";
import type { YandexMapStorePoint } from "@/components/map/yandex-map";
import "@/app/(site)/(with-header)/catalog/catalog.css";

export const dynamic = "force-dynamic";

function toMapStores(
  rows: Array<{
    name: string;
    slug: string;
    latitude: number | null;
    longitude: number | null;
    logo: string | null;
  }>,
): YandexMapStorePoint[] {
  return rows
    .filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude) &&
        r.latitude >= -90 &&
        r.latitude <= 90 &&
        r.longitude >= -180 &&
        r.longitude <= 180,
    )
    .map((r) => ({
      name: r.name,
      slug: r.slug,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
      logoUrl: r.logo?.trim() || null,
    }));
}

type MapCategoriesSearchParams = {
  tab?: string | string[];
  category?: string | string[];
  subcategory?: string | string[];
  types?: string | string[];
  businessTypes?: string | string[];
  sort?: string | string[];
  q?: string | string[];
  lat?: string | string[];
  lng?: string | string[];
  radiusKm?: string | string[];
};

type MapStoreCardItem = {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  businessTypes: StoreBusinessType[];
  fulfillmentModes: string[];
  workDescription: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  vkUrl: string | null;
  telegramUrl: string | null;
  whatsappUrl: string | null;
  otherMessengerUrl: string | null;
  productsCount: number;
};

const MAP_PRODUCTS_PAGE_SIZE = 15;

export default async function MapCategoriesPage({
  searchParams,
}: {
  searchParams: MapCategoriesSearchParams;
}) {
  const categorySlug = firstSearchParam(searchParams.category);
  const subcategorySlug = firstSearchParam(searchParams.subcategory);
  const q = (firstSearchParam(searchParams.q) ?? "").trim();
  const lat = Number.parseFloat(firstSearchParam(searchParams.lat) ?? "");
  const lng = Number.parseFloat(firstSearchParam(searchParams.lng) ?? "");
  const radiusKm = Number.parseFloat(firstSearchParam(searchParams.radiusKm) ?? "");
  const hasGeoRadius = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0;
  const sort = normalizeCatalogSort(firstSearchParam(searchParams.sort));
  const selectedStoreTypes = parseStoreBusinessTypesFromQueryStrings(
    [
      ...(firstSearchParam(searchParams.types)?.split(",").map((x) => x.trim()).filter(Boolean) ?? []),
      ...((Array.isArray(searchParams.businessTypes) ? searchParams.businessTypes : [searchParams.businessTypes])
        .filter((v): v is string => typeof v === "string")
        .map((x) => x.trim())
        .filter(Boolean)),
    ],
  );
  const selectedStoreType = selectedStoreTypes[0] ?? null;

  const [rootCategories, childCategories, storeRows, subcategoryCategory] = await Promise.all([
    getHomeMarketplaceCategoriesWithCounts(),
    categorySlug
      ? getMarketplaceChildCategoriesWithCountsByParentSlug(categorySlug)
      : Promise.resolve([]),
    prisma.store.findMany({
      where: catalogListableStoreWithCoordsWhere(),
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        latitude: true,
        longitude: true,
        businessTypes: true,
        fulfillmentModes: true,
        workDescription: true,
        phone: true,
        address: true,
        vkUrl: true,
        telegramUrl: true,
        whatsappUrl: true,
        otherMessengerUrl: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    }),
    subcategorySlug
      ? prisma.marketplaceCategory.findUnique({
          where: { slug: subcategorySlug },
          select: { id: true, name: true, slug: true, parentId: true },
        })
      : Promise.resolve(null),
  ]);

  const storeRowsInRadius =
    hasGeoRadius
      ? filterByRadiusKm(
          storeRows.filter(
            (r): r is typeof r & { latitude: number; longitude: number } =>
              typeof r.latitude === "number" && typeof r.longitude === "number",
          ),
          { lat, lng },
          radiusKm,
        )
      : storeRows;
  let queryFilteredStoreRows = storeRowsInRadius;
  if (q.length > 0 && storeRowsInRadius.length > 0) {
    const storeIdsInRadius = storeRowsInRadius.map((s) => s.id);
    const matchedProductStoreRows = await prisma.product.findMany({
      where: {
        active: true,
        storeId: { in: storeIdsInRadius },
        slug: { not: "" },
        images: {
          some: {
            url: { not: "" },
          },
        },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { storeId: true },
      distinct: ["storeId"],
    });
    const matchedProductStoreIds = new Set(matchedProductStoreRows.map((row) => row.storeId));
    const queryLower = q.toLocaleLowerCase("ru-RU");
    queryFilteredStoreRows = storeRowsInRadius.filter((store) => {
      if (matchedProductStoreIds.has(store.id)) return true;
      if (store.name.toLocaleLowerCase("ru-RU").includes(queryLower)) return true;
      return store.businessTypes.some((type) =>
        storeBusinessTypeLabel(type as StoreBusinessType).toLocaleLowerCase("ru-RU").includes(queryLower),
      );
    });
  }
  const filteredStoreRows = selectedStoreType
    ? queryFilteredStoreRows.filter((s) => s.businessTypes.includes(selectedStoreType))
    : queryFilteredStoreRows;
  const stores = toMapStores(filteredStoreRows);
  const facetRows = storeRowsInRadius.map((s) => ({
    businessTypes: s.businessTypes as StoreBusinessType[],
  }));
  const storeBusinessTypeTiles = buildStoreBusinessTypeTilesForMap(facetRows, facetRows);
  const storeCards: MapStoreCardItem[] = filteredStoreRows.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    logo: s.logo,
    businessTypes: s.businessTypes as StoreBusinessType[],
    fulfillmentModes: s.fulfillmentModes,
    workDescription: s.workDescription,
    phone: s.phone,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    vkUrl: s.vkUrl,
    telegramUrl: s.telegramUrl,
    whatsappUrl: s.whatsappUrl,
    otherMessengerUrl: s.otherMessengerUrl,
    productsCount: s._count.products,
  }));

  const tabRaw = firstSearchParam(searchParams.tab);
  const initialMapTab =
    tabRaw?.toLowerCase() === "stores" ? ("stores" as const) : ("products" as const);
  const productsAreSubcategories = Boolean(categorySlug && childCategories.length > 0);
  const selectedRootCategory =
    categorySlug && !productsAreSubcategories ? rootCategories.find((c) => c.slug === categorySlug) ?? null : null;
  const selectedSubcategory =
    productsAreSubcategories && subcategoryCategory && subcategoryCategory.parentId != null && childCategories.some((c) => c.id === subcategoryCategory.id)
      ? {
          id: subcategoryCategory.id,
          name: subcategoryCategory.name,
          slug: subcategoryCategory.slug,
        }
      : selectedRootCategory
        ? {
            id: selectedRootCategory.id,
            name: selectedRootCategory.name,
            slug: selectedRootCategory.slug,
          }
      : null;
  const categories = productsAreSubcategories ? childCategories : rootCategories;
  const parentCategoryName = productsAreSubcategories
    ? (rootCategories.find((c) => c.slug === categorySlug)?.name ?? null)
    : null;
  const parentCategoryId = productsAreSubcategories
    ? (rootCategories.find((c) => c.slug === categorySlug)?.id ?? null)
    : null;
  const productsBackHref =
    productsAreSubcategories && selectedSubcategory && categorySlug
      ? `/map/categories?category=${encodeURIComponent(categorySlug)}`
      : "/map/categories";

  let initialSubcategoryProducts:
    | {
        items: Array<{
          id: string;
          slug: string | null;
          storeSlug: string | null;
          name: string;
          price: number;
          imageUrl: string | null;
          storeName: string;
          storeLogoUrl: string | null;
          fulfillmentModes: string[];
        }>;
        hasMore: boolean;
        total: number;
      }
    | null = null;
  let initialSearchProducts:
    | {
        items: Array<{
          id: string;
          slug: string | null;
          storeSlug: string | null;
          name: string;
          price: number;
          imageUrl: string | null;
          storeName: string;
          storeLogoUrl: string | null;
          fulfillmentModes: string[];
        }>;
        hasMore: boolean;
        total: number;
      }
    | null = null;
  if (q.length > 0) {
    const { items, hasMore, total } = await searchProductsFullText(q, 0, MAP_PRODUCTS_PAGE_SIZE, {
      sortRaw: sort,
      latRaw: hasGeoRadius ? String(lat) : undefined,
      lngRaw: hasGeoRadius ? String(lng) : undefined,
      radiusKmRaw: hasGeoRadius ? String(radiusKm) : undefined,
    });
    initialSearchProducts = {
      items: items.map((p) => {
        const s = (p.slug ?? "").trim();
        return {
          id: p.id,
          slug: s === "" ? null : s,
          storeSlug: (p.storeSlug ?? "").trim() || null,
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl,
          storeName: p.storeName,
          storeLogoUrl: p.storeLogo?.trim() || null,
          fulfillmentModes: p.fulfillmentModes,
        };
      }),
      hasMore,
      total,
    };
  }
  if (selectedSubcategory) {
    const categoryIds = await resolveCatalogCategoryIds(selectedSubcategory.id);
    const where = buildCatalogProductWhere(undefined, categoryIds, [], []);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { take: 1, select: { url: true } },
          store: { select: { slug: true, name: true, logo: true, fulfillmentModes: true } },
        },
        take: MAP_PRODUCTS_PAGE_SIZE,
        skip: 0,
        orderBy: catalogProductOrderBy(sort),
      }),
      prisma.product.count({ where }),
    ]);
    initialSubcategoryProducts = {
      items: products.map((p) => {
        const s = (p.slug ?? "").trim();
        return {
          id: p.id,
          slug: s === "" ? null : s,
          storeSlug: p.store.slug?.trim() || null,
          name: p.name,
          price: p.price,
          imageUrl: p.images[0]?.url ?? null,
          storeName: p.store.name,
          storeLogoUrl: p.store.logo?.trim() || null,
          fulfillmentModes: p.store.fulfillmentModes,
        };
      }),
      hasMore: products.length < total,
      total,
    };
  }

  return (
    <MapCategoriesPageClient
      initialCategories={categories}
      initialStoreBusinessTypeTiles={storeBusinessTypeTiles}
      stores={stores}
      storeCards={storeCards}
      initialMapTab={initialMapTab}
      productsAreSubcategories={productsAreSubcategories}
      parentCategoryName={parentCategoryName}
      parentCategorySlug={categorySlug ?? null}
      parentCategoryId={parentCategoryId}
      selectedSubcategory={selectedSubcategory}
      initialSubcategoryProducts={initialSubcategoryProducts}
      initialSearchProducts={initialSearchProducts}
      searchQuery={q.length > 0 ? q : null}
      productsBackHref={productsBackHref}
    />
  );
}
