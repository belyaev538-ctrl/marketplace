import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogBreadcrumb } from "@/components/catalog-breadcrumb";
import { CatalogCategoryCardLink } from "@/components/catalog-category-card-link";
import { firstSearchParam, manySearchParams } from "@/lib/search-params";
import { catalogCategoryPath, pickCatalogNavFilters } from "@/lib/catalog-url";
import { getVisibleMarketplaceCategoryNavForStoreIds } from "@/lib/marketplace-catalog-categories";
import {
  buildCategoryCatalogBreadcrumbItems,
  getMarketplaceCategoryTrailRootToLeaf,
} from "@/lib/product-breadcrumb";
import type { ProductBreadcrumbItem } from "@/lib/product-breadcrumb";
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
import { prisma } from "@/lib/prisma";
import {
  getStoreIdsInCatalogGeoRadius,
  parseCatalogGeoRadiusFromSearchParams,
} from "@/lib/catalog-geo-radius";
import { Suspense } from "react";
import { CatalogFiltersAside } from "./catalog-filters-aside";
import { CatalogProductGrid } from "./catalog-product-grid";
import { CatalogProductsToolbar } from "./catalog-products-toolbar";
import { CatalogSearchBar } from "./catalog-search-bar";
import { CatalogCategoryCardsCollapsible } from "./catalog-category-cards-collapsible";
import { CatalogSortFilterBar } from "./catalog-sort-filter-bar";
import { CatalogGeoSync } from "./catalog-geo-sync";
import { EmptyState } from "@/components/ui/empty-state";
import "./catalog.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: {
    store?: string | string[];
    category?: string | string[];
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

export default async function CatalogPage({ searchParams }: Props) {
  const businessTypesRaw = manySearchParams(searchParams.businessTypes);
  const businessTypesFilter = parseStoreBusinessTypesFromQueryStrings(businessTypesRaw);

  const storeSlug = firstSearchParam(searchParams.store);
  const activeCategory = firstSearchParam(searchParams.category);
  const minPriceRaw = firstSearchParam(searchParams.minPrice);
  const maxPriceRaw = firstSearchParam(searchParams.maxPrice);
  const sortRaw = firstSearchParam(searchParams.sort);
  const offsetRaw = firstSearchParam(searchParams.offset);
  const fulfillmentModes = manySearchParams(searchParams.fulfillment);
  const geoRadius = parseCatalogGeoRadiusFromSearchParams(searchParams);
  const storeIdsInRadius = geoRadius ? await getStoreIdsInCatalogGeoRadius(geoRadius) : null;
  const geoPreserved = geoRadius
    ? {
        lat: String(geoRadius.lat),
        lng: String(geoRadius.lng),
        radiusKm: String(geoRadius.radiusKm),
      }
    : {};

  const [stores, navForSidebar] = await Promise.all([
    prisma.store.findMany({
      where: {
        ...catalogListableStoreWhere(businessTypesFilter),
        ...(storeIdsInRadius ? { id: { in: storeIdsInRadius } } : {}),
      },
      orderBy: { name: "asc" },
    }),
    getVisibleMarketplaceCategoryNavForStoreIds(storeIdsInRadius ?? undefined),
  ]);
  const listOffset = Math.max(0, parseInt(offsetRaw ?? "0", 10) || 0);
  const { minPrice, maxPrice } = parseCatalogPriceParams(minPriceRaw, maxPriceRaw);
  const orderBy = catalogProductOrderBy(sortRaw);
  const sortParam = normalizeCatalogSort(sortRaw);
  const catalogNav = pickCatalogNavFilters(searchParams);

  let category: { id: string; name: string; slug: string } | null = null;

  if (activeCategory) {
    const row = await prisma.marketplaceCategory.findUnique({
      where: { id: activeCategory },
      select: { id: true, name: true, slug: true },
    });
    if (!row) {
      notFound();
    }
    category = row;
  }

  const isCatalogHub = !activeCategory;

  let categoryIdsForPage: string[] = [];
  let catalogSidebarBusinessTypes = storeBusinessTypesPresentOnStores([]);
  if (isCatalogHub) {
    const globalFacet = await prisma.store.findMany({
      where: {
        ...catalogListableStoreWhere([]),
        ...(storeIdsInRadius ? { id: { in: storeIdsInRadius } } : {}),
      },
      select: { businessTypes: true },
    });
    catalogSidebarBusinessTypes = storeBusinessTypesPresentOnStores(globalFacet);
  } else if (category) {
    categoryIdsForPage = await resolveCatalogCategoryIds(category.id);
    const scopedFacet = await fetchStoresForBusinessTypeFacet({
      storeSlug,
      categoryIds: categoryIdsForPage,
      fulfillmentModes,
      ...(storeIdsInRadius ? { storeIdsInRadius } : {}),
    });
    catalogSidebarBusinessTypes = storeBusinessTypesPresentOnStores(scopedFacet);
  }

  const subcategoryChips =
    category != null
      ? navForSidebar.childCategories.filter((c) => c.parentId === category.id)
      : [];

  let initialItems: {
    id: string;
    slug: string | null;
    storeSlug: string | null;
    name: string;
    price: number;
    imageUrl: string | null;
    storeName: string;
    storeLogoUrl: string | null;
    fulfillmentModes: string[];
  }[] = [];
  let total = 0;
  let hasMore = false;

  if (!isCatalogHub && activeCategory) {
    const productWhere = mergeCatalogPriceIntoWhere(
      buildCatalogProductWhere(
        storeSlug,
        categoryIdsForPage,
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

    const [products, totalCount] = await Promise.all([
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
    ]);

    total = totalCount;
    hasMore = listOffset + products.length < total;
    initialItems = products.map((p) => {
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
  }

  const categoryTrail = category
    ? await getMarketplaceCategoryTrailRootToLeaf(category.id)
    : [];
  const breadcrumbItems: ProductBreadcrumbItem[] = category
    ? buildCategoryCatalogBreadcrumbItems(categoryTrail)
    : [{ label: "Каталог", href: null }];

  /** На хабе только корневые рубрики; подкатегории — на странице `/catalog/[slug]`. */
  const hubCategoryTree = (
    <CatalogCategoryCardsCollapsible>
      {navForSidebar.categories.map((parent, pIndex) => (
        <CatalogCategoryCardLink
          key={parent.id}
          href={catalogCategoryPath(parent.slug, storeSlug, catalogNav)}
          name={parent.name}
          count={parent.count}
          styleIndex={pIndex}
        />
      ))}
    </CatalogCategoryCardsCollapsible>
  );

  return (
    <div className="min-h-full bg-white pb-10">
      <CatalogGeoSync />
      <CatalogSearchBar />

      {isCatalogHub ? (
        <section
          className="categories pt-[18px] pb-[30px] md:pb-[50px]"
          aria-labelledby="catalog-goods-heading"
        >
          <div className="mx-auto w-full max-w-[1385px] px-[15px]">
            <CatalogBreadcrumb items={breadcrumbItems} />
            <div className="flex flex-col gap-2.5 md:gap-[26px]">
              <h2
                id="catalog-goods-heading"
                className="text-base font-extrabold text-blueNavy md:text-[22px]"
              >
                Каталог товаров
              </h2>
              {navForSidebar.categories.length > 0 ? (
                hubCategoryTree
              ) : (
                <EmptyState className="py-8" />
              )}
            </div>
          </div>
        </section>
      ) : (
        <main className="mx-auto w-full max-w-[1385px] px-[15px] pt-[18px] pb-[30px] md:pb-[50px]">
          <CatalogBreadcrumb items={breadcrumbItems} />

          <div className="flex flex-col gap-2.5 md:gap-[26px]">
            <h1 className="text-base font-extrabold text-blueNavy md:text-[22px]">{category!.name}</h1>
          </div>

          <div className="mt-5 flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-[25px]">
            <CatalogFiltersAside
              storeSlug={storeSlug}
              activeCategory={activeCategory}
              nav={navForSidebar}
              catalogNav={catalogNav}
              filterBasePath="/catalog"
              catalogSidebarBusinessTypes={catalogSidebarBusinessTypes}
              filterPreserved={{
                store: storeSlug,
                category: activeCategory,
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
                  href={catalogCategoryPath(category!.slug, undefined, catalogNav)}
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
                      href={catalogCategoryPath(category!.slug, store.slug, catalogNav)}
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
                  basePath="/catalog"
                  preserved={{
                    store: storeSlug,
                    category: activeCategory,
                    fulfillment: fulfillmentModes,
                    businessTypes: businessTypesRaw,
                    ...geoPreserved,
                  }}
                />
              </div>

              {category && subcategoryChips.length > 0 ? (
                <section className="mb-[30px]">
                  <h2 className="mb-4 text-sm font-extrabold text-blueNavy md:text-base">
                    Подкатегории
                  </h2>
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
                  basePath="/catalog"
                  preserved={{
                    store: storeSlug,
                    category: activeCategory,
                    fulfillment: fulfillmentModes,
                    businessTypes: businessTypesRaw,
                    ...geoPreserved,
                  }}
                />
              </Suspense>

              <CatalogProductGrid
                key={`${activeCategory ?? ""}:${storeSlug ?? ""}:${minPriceRaw ?? ""}:${maxPriceRaw ?? ""}:${sortParam}:${fulfillmentModes.join(",")}:${businessTypesRaw.join(",")}:${listOffset}`}
                initialItems={initialItems}
                initialHasMore={hasMore}
                category={activeCategory}
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
      )}
    </div>
  );
}
