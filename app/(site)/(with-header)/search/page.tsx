import { Suspense } from "react";
import { CatalogProductGrid } from "@/app/(site)/(with-header)/catalog/catalog-product-grid";
import { CatalogProductsToolbar } from "@/app/(site)/(with-header)/catalog/catalog-products-toolbar";
import { CatalogSearchBar } from "@/app/(site)/(with-header)/catalog/catalog-search-bar";
import { CatalogSortFilterBar } from "@/app/(site)/(with-header)/catalog/catalog-sort-filter-bar";
import {
  CATALOG_ASIDE_FILTER_FORM_ID,
  catalogSidebarFilterResetHref,
} from "@/lib/catalog-sidebar-filters";
import { firstSearchParam, manySearchParams } from "@/lib/search-params";
import { searchProductsFullText } from "@/lib/product-search-fts";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const fulfillmentToggleTrack =
  "relative h-[17px] w-[34px] shrink-0 rounded-full border border-blue bg-white shadow-none after:absolute after:start-[2px] after:top-0.5 after:h-[11px] after:w-[11px] after:rounded-full after:border after:border-blue after:bg-blue after:transition-all after:content-[''] peer-checked:border-green peer-checked:bg-green peer-checked:after:translate-x-[150%] peer-checked:after:border-green peer-checked:after:bg-white rtl:peer-checked:after:-translate-x-full";

type Props = {
  searchParams: {
    q?: string | string[];
    fulfillment?: string | string[];
    minPrice?: string | string[];
    maxPrice?: string | string[];
    sort?: string | string[];
    businessTypes?: string | string[];
    lat?: string | string[];
    lng?: string | string[];
    radiusKm?: string | string[];
    offset?: string | string[];
  };
};

export default async function SearchPage({ searchParams }: Props) {
  const query = (firstSearchParam(searchParams.q) ?? "").trim();
  const fulfillmentModes = manySearchParams(searchParams.fulfillment);
  const businessTypes = manySearchParams(searchParams.businessTypes);
  const minPriceRaw = firstSearchParam(searchParams.minPrice);
  const maxPriceRaw = firstSearchParam(searchParams.maxPrice);
  const sortRaw = firstSearchParam(searchParams.sort);
  const offsetRaw = firstSearchParam(searchParams.offset);
  const latRaw = firstSearchParam(searchParams.lat) ?? undefined;
  const lngRaw = firstSearchParam(searchParams.lng) ?? undefined;
  const radiusKmRaw = firstSearchParam(searchParams.radiusKm) ?? undefined;
  const listOffset = Math.max(0, parseInt(offsetRaw ?? "0", 10) || 0);

  const preserved = {
    q: query,
    fulfillment: fulfillmentModes,
    businessTypes,
    lat: latRaw,
    lng: lngRaw,
    radiusKm: radiusKmRaw,
  };

  if (!query) {
    return (
      <div className="min-h-full bg-white pb-10">
        <CatalogSearchBar />
        <main className="mx-auto w-full max-w-[1385px] px-[15px] pt-[18px] pb-[30px] md:pb-[50px]">
          <h1 className="mt-4 text-base font-extrabold text-blueNavy md:text-[22px]">Поиск</h1>
          <p className="mt-3 text-sm text-blueSteel">Введите запрос</p>
        </main>
      </div>
    );
  }

  const { items, hasMore, total } = await searchProductsFullText(query, listOffset, PAGE_SIZE, {
    fulfillmentModes,
    minPriceRaw: minPriceRaw ?? undefined,
    maxPriceRaw: maxPriceRaw ?? undefined,
    sortRaw: sortRaw ?? undefined,
    businessTypesRaw: businessTypes,
    latRaw,
    lngRaw,
    radiusKmRaw,
  });

  const initialItems = items.map((p) => {
    const s = p.slug.trim();
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
  });

  return (
    <div className="min-h-full bg-white pb-10">
      <CatalogSearchBar />
      <main className="mx-auto w-full max-w-[1385px] px-[15px] pt-[18px] pb-[30px] md:pb-[50px]">
        <h1 className="text-base font-extrabold text-blueNavy md:text-[22px]">Результаты поиска: &quot;{query}&quot;</h1>

        <div className="mt-5 flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-[25px]">
          <aside
            className="filter_wrap hidden min-w-[205px] max-w-[205px] shrink-0 flex-col lg:flex"
            aria-label="Фильтры поиска"
          >
            <div className="flex flex-col gap-3">
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  name="fulfillment"
                  value="delivery"
                  defaultChecked={fulfillmentModes.includes("delivery")}
                  form={CATALOG_ASIDE_FILTER_FORM_ID}
                />
                <div className={fulfillmentToggleTrack} />
                <span className="ms-2.5 text-xs font-medium text-blueNavy">Доставка</span>
              </label>
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  name="fulfillment"
                  value="pickup"
                  defaultChecked={fulfillmentModes.includes("pickup")}
                  form={CATALOG_ASIDE_FILTER_FORM_ID}
                />
                <div className={fulfillmentToggleTrack} />
                <span className="ms-2.5 text-xs font-medium text-blueNavy">Самовывоз</span>
              </label>
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  name="fulfillment"
                  value="offline"
                  defaultChecked={fulfillmentModes.includes("offline")}
                  form={CATALOG_ASIDE_FILTER_FORM_ID}
                />
                <div className={fulfillmentToggleTrack} />
                <span className="ms-2.5 text-xs font-medium text-blueNavy">Посещение</span>
              </label>
            </div>

            <CatalogSortFilterBar basePath="/search" preserved={preserved} layout="sidebar" />

            <div className="mt-6 flex w-full flex-col gap-2.5">
              <button
                type="submit"
                form={CATALOG_ASIDE_FILTER_FORM_ID}
                className="w-full rounded-md bg-blue py-[11px] text-[13px] font-bold text-white transition-colors hover:opacity-95"
              >
                Применить
              </button>
              <Link
                href={catalogSidebarFilterResetHref("/search", preserved)}
                prefetch={false}
                className="inline-flex w-full items-center justify-center rounded-md border border-blueExtraLight bg-white py-[11px] text-center text-[13px] font-semibold text-blueNavy transition-colors hover:border-blue hover:text-blue"
              >
                Сбросить
              </Link>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="lg:hidden">
              <CatalogSortFilterBar basePath="/search" preserved={preserved} />
            </div>

            <Suspense fallback={null}>
              <CatalogProductsToolbar total={total} basePath="/search" preserved={preserved} />
            </Suspense>

            {initialItems.length === 0 ? (
              <p className="mt-8 text-sm text-blueSteel">Ничего не найдено</p>
            ) : (
              <CatalogProductGrid
                key={`${query}:${fulfillmentModes.join(",")}:${businessTypes.join(",")}:${minPriceRaw ?? ""}:${maxPriceRaw ?? ""}:${sortRaw ?? ""}:${listOffset}`}
                initialItems={initialItems}
                initialHasMore={hasMore}
                ftsQuery={query}
                fulfillment={fulfillmentModes}
                businessTypes={businessTypes}
                minPrice={minPriceRaw ?? undefined}
                maxPrice={maxPriceRaw ?? undefined}
                sort={sortRaw ?? undefined}
                initialSkip={listOffset}
                extraQueryParams={{
                  lat: latRaw,
                  lng: lngRaw,
                  radiusKm: radiusKmRaw,
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
