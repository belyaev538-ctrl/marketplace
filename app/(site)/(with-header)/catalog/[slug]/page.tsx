import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { CatalogBreadcrumb } from "@/components/catalog-breadcrumb";
import { CatalogCategoryCardLink } from "@/components/catalog-category-card-link";
import { firstSearchParam, manySearchParams } from "@/lib/search-params";
import {
  buildCatalogProductWhere,
  catalogListableStoreWhere,
  fetchStoresForBusinessTypeFacet,
  resolveCatalogCategoryIds,
} from "@/lib/catalog-products-query";
import {
  parseStoreBusinessTypesFromQueryStrings,
  storeBusinessTypesPresentOnStores,
} from "@/lib/store-business-type";
import {
  catalogProductOrderBy,
  mergeCatalogPriceIntoWhere,
  normalizeCatalogSort,
  parseCatalogPriceParams,
} from "@/lib/catalog-list-query";
import { catalogCategoryPath, pickCatalogNavFilters } from "@/lib/catalog-url";
import { getVisibleMarketplaceCategoryNavForStoreIds } from "@/lib/marketplace-catalog-categories";
import {
  buildCategoryCatalogBreadcrumbItems,
  getMarketplaceCategoryTrailRootToLeaf,
} from "@/lib/product-breadcrumb";
import { createUniqueMarketplaceCategorySlug } from "@/lib/marketplace-category-slug";
import { prisma } from "@/lib/prisma";
import {
  getStoreIdsInCatalogGeoRadius,
  parseCatalogGeoRadiusFromSearchParams,
} from "@/lib/catalog-geo-radius";
import { CatalogFiltersAside } from "../catalog-filters-aside";
import { CatalogProductGrid } from "../catalog-product-grid";
import { CatalogProductsToolbar } from "../catalog-products-toolbar";
import { CatalogCategoryCardsCollapsible } from "../catalog-category-cards-collapsible";
import { CatalogSearchBar } from "../catalog-search-bar";
import { CatalogSortFilterBar } from "../catalog-sort-filter-bar";
import { CatalogGeoSync } from "../catalog-geo-sync";
import "../catalog.css";

export const dynamic = "force-dynamic";

type Props = {
  params: { slug: string };
  searchParams: {
    store?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    sort?: string | string[];
    offset?: string | string[];
    fulfillment?: string | string[];
    businessTypes?: string | string[];
    lat?: string | string[];
    lng?: string | string[];
    radiusKm?: string | string[];
  };
};

const PAGE_SIZE = 25;

function catalogCategoryPreserveQueryRedirectPath(
  canonicalSlug: string,
  searchParams: Props["searchParams"],
): string {
  const qs = new URLSearchParams();
  const store = firstSearchParam(searchParams.store);
  if (store) qs.set("store", store);
  const minP = firstSearchParam(searchParams.minPrice);
  if (minP) qs.set("minPrice", minP);
  const maxP = firstSearchParam(searchParams.maxPrice);
  if (maxP) qs.set("maxPrice", maxP);
  const sort = firstSearchParam(searchParams.sort);
  if (sort) qs.set("sort", sort);
  const off = firstSearchParam(searchParams.offset);
  if (off) qs.set("offset", off);
  for (const f of manySearchParams(searchParams.fulfillment)) {
    if (f.trim()) qs.append("fulfillment", f.trim());
  }
  for (const b of manySearchParams(searchParams.businessTypes)) {
    if (b.trim()) qs.append("businessTypes", b.trim());
  }
  const lat = firstSearchParam(searchParams.lat);
  if (lat) qs.set("lat", lat);
  const lng = firstSearchParam(searchParams.lng);
  if (lng) qs.set("lng", lng);
  const radiusKm = firstSearchParam(searchParams.radiusKm);
  if (radiusKm) qs.set("radiusKm", radiusKm);
  const tail = qs.toString();
  const path = `/catalog/${encodeURIComponent(canonicalSlug)}`;
  return tail ? `${path}?${tail}` : path;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug?.trim();
  if (!slug) return { title: "Категория" };

  let category = await prisma.marketplaceCategory.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!category && slug.startsWith("mc-")) {
    const legacyId = slug.slice(3).trim();
    if (legacyId) {
      category = await prisma.marketplaceCategory.findUnique({
        where: { id: legacyId },
        select: { name: true },
      });
    }
  }
  if (!category) return { title: "Категория" };
  const { name } = category;
  return {
    title: `Купить ${name} в вашем районе`,
    description: `Товары «${name}» от локальных магазинов: актуальные цены и наличие в каталоге маркетплейса.`,
  };
}

export default async function CatalogCategoryBySlugPage({ params, searchParams }: Props) {
  const slug = params.slug?.trim();
  if (!slug) {
    notFound();
  }

  let category = await prisma.marketplaceCategory.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });
  if (!category && slug.startsWith("mc-")) {
    const legacyId = slug.slice(3).trim();
    if (legacyId) {
      category = await prisma.marketplaceCategory.findUnique({
        where: { id: legacyId },
        select: { id: true, name: true, slug: true },
      });
    }
  }
  if (!category) {
    notFound();
  }

  if (category.slug.startsWith("mc-")) {
    const seo = await createUniqueMarketplaceCategorySlug(category.name, {
      excludeCategoryId: category.id,
    });
    if (seo !== category.slug) {
      await prisma.marketplaceCategory.update({
        where: { id: category.id },
        data: { slug: seo },
      });
    }
    permanentRedirect(catalogCategoryPreserveQueryRedirectPath(seo, searchParams));
  }

  if (slug !== category.slug) {
    permanentRedirect(catalogCategoryPreserveQueryRedirectPath(category.slug, searchParams));
  }

  const businessTypesRaw = manySearchParams(searchParams.businessTypes);
  const businessTypesFilter = parseStoreBusinessTypesFromQueryStrings(businessTypesRaw);

  const storeSlug = firstSearchParam(searchParams.store);
  const minPriceRaw = firstSearchParam(searchParams.minPrice);
  const maxPriceRaw = firstSearchParam(searchParams.maxPrice);
  const sortRaw = firstSearchParam(searchParams.sort);
  const offsetRaw = firstSearchParam(searchParams.offset);
  const fulfillmentModes = manySearchParams(searchParams.fulfillment);

  const categoryIds = await resolveCatalogCategoryIds(category.id);
  const geoRadius = parseCatalogGeoRadiusFromSearchParams(searchParams);
  const storeIdsInRadius = geoRadius ? await getStoreIdsInCatalogGeoRadius(geoRadius) : null;
  const geoPreserved = geoRadius
    ? {
        lat: String(geoRadius.lat),
        lng: String(geoRadius.lng),
        radiusKm: String(geoRadius.radiusKm),
      }
    : {};

  const [stores, storesForBusinessTypeFacet, navForSidebar] = await Promise.all([
    prisma.store.findMany({
      where: {
        ...catalogListableStoreWhere(businessTypesFilter),
        ...(storeIdsInRadius ? { id: { in: storeIdsInRadius } } : {}),
      },
      orderBy: { name: "asc" },
    }),
    fetchStoresForBusinessTypeFacet({
      storeSlug,
      categoryIds,
      fulfillmentModes,
      ...(storeIdsInRadius ? { storeIdsInRadius } : {}),
    }),
    getVisibleMarketplaceCategoryNavForStoreIds(storeIdsInRadius),
  ]);

  const catalogSidebarBusinessTypes = storeBusinessTypesPresentOnStores(
    storesForBusinessTypeFacet,
  );

  const listOffset = Math.max(0, parseInt(offsetRaw ?? "0", 10) || 0);
  const { minPrice, maxPrice } = parseCatalogPriceParams(minPriceRaw, maxPriceRaw);
  const orderBy = catalogProductOrderBy(sortRaw);
  const sortParam = normalizeCatalogSort(sortRaw);
  const catalogNav = pickCatalogNavFilters(searchParams);
  const productWhere = mergeCatalogPriceIntoWhere(
    buildCatalogProductWhere(
      storeSlug,
      categoryIds,
      fulfillmentModes,
      businessTypesFilter,
    ),
    minPrice,
    maxPrice,
  );
  const scopedProductWhere = {
    ...productWhere,
    ...(storeIdsInRadius ? { storeId: { in: storeIdsInRadius } } : {}),
  };

  const [products, total, categoryTrail] = await Promise.all([
    prisma.product.findMany({
      where: scopedProductWhere,
      include: {
        images: {
          take: 1,
          select: { url: true },
        },
        store: { select: { slug: true, name: true, logo: true, fulfillmentModes: true } },
      },
      take: PAGE_SIZE,
      skip: listOffset,
      orderBy,
    }),
    prisma.product.count({ where: scopedProductWhere }),
    getMarketplaceCategoryTrailRootToLeaf(category.id),
  ]);

  const hasMore = listOffset + products.length < total;

  const initialItems = products.map((p) => {
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
  });

  const subcategoryChips = navForSidebar.childCategories.filter(
    (c) => c.parentId === category.id,
  );

  const breadcrumbItems = buildCategoryCatalogBreadcrumbItems(categoryTrail);

  return (
    <div className="min-h-full bg-white pb-10">
      <CatalogGeoSync />
      <CatalogSearchBar showOnMapHref={`/map/categories?category=${encodeURIComponent(category.slug)}`} />

      <main className="mx-auto w-full max-w-[1385px] px-[15px] pt-[18px] pb-[30px] md:pb-[50px]">
        <CatalogBreadcrumb items={breadcrumbItems} />

        <div className="flex flex-col gap-2.5 md:gap-[26px]">
          <h1 className="text-base font-extrabold text-blueNavy md:text-[22px]">{category.name}</h1>
        </div>

        <div className="mt-5 flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-[25px]">
          <CatalogFiltersAside
            storeSlug={storeSlug}
            activeCategory={category.id}
            nav={navForSidebar}
            catalogNav={catalogNav}
            filterBasePath={`/catalog/${category.slug}`}
            catalogSidebarBusinessTypes={catalogSidebarBusinessTypes}
            filterPreserved={{
              store: storeSlug,
              fulfillment: fulfillmentModes,
              businessTypes: businessTypesRaw,
              ...geoPreserved,
            }}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-wrap items-center gap-2 lg:hidden">
              <span className="text-xs font-medium text-blueSteel">Магазин:</span>
              <Link
                prefetch={false}
                href={catalogCategoryPath(category.slug, undefined, catalogNav)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !storeSlug
                    ? "border-blue bg-blue text-white"
                    : "border-blueExtraLight bg-white text-blueNavy hover:border-blue hover:text-blue"
                }`}
              >
                Все
              </Link>
              {stores.map((store) => {
                const active = storeSlug === store.slug;
                return (
                  <Link
                    key={store.id}
                    prefetch={false}
                    href={catalogCategoryPath(category.slug, store.slug, catalogNav)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? "border-blue bg-blue text-white"
                        : "border-blueExtraLight bg-white text-blueNavy hover:border-blue hover:text-blue"
                    }`}
                  >
                    {store.name}
                  </Link>
                );
              })}
            </div>

            <div className="lg:hidden">
              <CatalogSortFilterBar
                basePath={`/catalog/${category.slug}`}
                preserved={{
                  store: storeSlug,
                  fulfillment: fulfillmentModes,
                  businessTypes: businessTypesRaw,
                  ...geoPreserved,
                }}
              />
            </div>

            {subcategoryChips.length > 0 ? (
              <section className="mb-[30px]">
                <h2 className="mb-4 text-sm font-extrabold text-blueNavy md:text-base">Подкатегории</h2>
                <CatalogCategoryCardsCollapsible>
                  {subcategoryChips.map((child, index) => (
                    <CatalogCategoryCardLink
                      key={child.id}
                      href={catalogCategoryPath(child.slug, storeSlug, catalogNav)}
                      name={child.name}
                      count={child.count}
                      level={2}
                      styleIndex={index}
                    />
                  ))}
                </CatalogCategoryCardsCollapsible>
              </section>
            ) : null}

            <Suspense fallback={null}>
              <CatalogProductsToolbar
                total={total}
                basePath={`/catalog/${category.slug}`}
                preserved={{
                  store: storeSlug,
                  fulfillment: fulfillmentModes,
                  businessTypes: businessTypesRaw,
                  ...geoPreserved,
                }}
              />
            </Suspense>

            <CatalogProductGrid
              key={`${category.id}:${storeSlug ?? ""}:${minPriceRaw ?? ""}:${maxPriceRaw ?? ""}:${sortParam}:${fulfillmentModes.join(",")}:${businessTypesRaw.join(",")}:${listOffset}`}
              initialItems={initialItems}
              initialHasMore={hasMore}
              category={category.id}
              store={storeSlug}
              minPrice={minPriceRaw}
              maxPrice={maxPriceRaw}
              sort={sortParam}
              fulfillment={fulfillmentModes}
              businessTypes={businessTypesRaw}
              extraQueryParams={{
                ...geoPreserved,
              }}
              initialSkip={listOffset}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
