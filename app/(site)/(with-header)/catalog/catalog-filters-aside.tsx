import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import type { NavCategoryRow } from "@/lib/marketplace-catalog-categories";
import type { CatalogNavFilterSource } from "@/lib/catalog-url";
import { catalogCategoryPath, catalogRootPath } from "@/lib/catalog-url";
import type { StoreBusinessType } from "@prisma/client";
import type { CatalogListQueryPreserved } from "@/lib/catalog-list-query";
import { STORE_BUSINESS_TYPE_OPTIONS } from "@/lib/store-business-type";
import {
  CATALOG_ASIDE_FILTER_FORM_ID,
  catalogSidebarFilterResetHref,
} from "@/lib/catalog-sidebar-filters";
import { CatalogSortFilterBar } from "./catalog-sort-filter-bar";

type Nav = { categories: NavCategoryRow[]; childCategories: NavCategoryRow[] };

const fulfillmentToggleTrack =
  "relative h-[17px] w-[34px] shrink-0 rounded-full border border-blue bg-white shadow-none after:absolute after:start-[2px] after:top-0.5 after:h-[11px] after:w-[11px] after:rounded-full after:border after:border-blue after:bg-blue after:transition-all after:content-[''] peer-checked:border-green peer-checked:bg-green peer-checked:after:translate-x-[150%] peer-checked:after:border-green peer-checked:after:bg-white rtl:peer-checked:after:-translate-x-full";

/** Как .category-btn в reference-layout/products2.html (+ .active в input.css). */
function categoryItemClass(isActive: boolean) {
  return [
    "flex w-full items-center gap-[5px] rounded-md px-2.5 py-[11px] text-start text-[13px] whitespace-nowrap transition-colors",
    isActive
      ? "bg-blueExtraLight font-semibold text-blueNavy hover:bg-blueExtraLight"
      : "font-medium text-blueNavy hover:bg-blueExtraLight",
  ].join(" ");
}

/** Как .categoryAll-btn: внизу списка, синий текст. */
const categoryAllRowClass =
  "flex w-full items-center gap-[5px] rounded-md px-2.5 py-[13px] text-start text-[13px] font-medium text-blue transition-colors hover:bg-blueExtraLight";

function sidebarRootHighlightId(activeCategory: string | undefined, nav: Nav): string | undefined {
  if (!activeCategory) return undefined;
  if (nav.categories.some((c) => c.id === activeCategory)) return activeCategory;
  const child = nav.childCategories.find((c) => c.id === activeCategory);
  return child?.parentId ?? undefined;
}

type Props = {
  storeSlug: string | undefined;
  activeCategory: string | undefined;
  nav: Nav;
  /** Текущие min/max/sort из URL — переносятся при смене категории/магазина. */
  catalogNav: CatalogNavFilterSource;
  /** Базовый путь для формы цены/сортировки: `/catalog` или `/catalog/slug` */
  filterBasePath: string;
  /** Сохраняемые query: store, category, fulfillment, businessTypes. */
  filterPreserved: CatalogListQueryPreserved;
  /** Типы магазинов, которые есть у активных участников каталога (без учёта текущего фильтра). */
  catalogSidebarBusinessTypes: StoreBusinessType[];
};

export function CatalogFiltersAside({
  storeSlug,
  activeCategory,
  nav,
  catalogNav,
  filterBasePath,
  filterPreserved,
  catalogSidebarBusinessTypes,
}: Props) {
  const selectedFulfillment = new Set(
    Array.isArray(catalogNav.fulfillment)
      ? catalogNav.fulfillment
      : catalogNav.fulfillment != null
        ? [catalogNav.fulfillment]
        : [],
  );
  const selectedBusinessTypes = new Set(
    Array.isArray(catalogNav.businessTypes)
      ? catalogNav.businessTypes.map(String)
      : catalogNav.businessTypes != null
        ? [String(catalogNav.businessTypes)]
        : [],
  );
  const rootHighlightId = sidebarRootHighlightId(activeCategory, nav);
  const allCategoriesActive = activeCategory == null || activeCategory === "";
  const inUseBusinessTypes = new Set(catalogSidebarBusinessTypes);
  const businessTypeCheckboxOptions = STORE_BUSINESS_TYPE_OPTIONS.filter(
    (o) => inUseBusinessTypes.has(o.value) || selectedBusinessTypes.has(o.value),
  );

  return (
    <aside
      className="filter_wrap hidden min-w-[205px] max-w-[205px] shrink-0 flex-col lg:flex"
      aria-label="Фильтры каталога"
    >
      <div className="flex flex-col gap-3">
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            id="catalog-fulfillment-delivery"
            name="fulfillment"
            value="delivery"
            defaultChecked={selectedFulfillment.has("delivery")}
            form={CATALOG_ASIDE_FILTER_FORM_ID}
          />
          <div className={fulfillmentToggleTrack} />
          <span className="ms-2.5 text-xs font-medium text-blueNavy">Доставка</span>
        </label>
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            id="catalog-fulfillment-pickup"
            name="fulfillment"
            value="pickup"
            defaultChecked={selectedFulfillment.has("pickup")}
            form={CATALOG_ASIDE_FILTER_FORM_ID}
          />
          <div className={fulfillmentToggleTrack} />
          <span className="ms-2.5 text-xs font-medium text-blueNavy">Самовывоз</span>
        </label>
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            id="catalog-fulfillment-visit"
            name="fulfillment"
            value="offline"
            defaultChecked={selectedFulfillment.has("offline")}
            form={CATALOG_ASIDE_FILTER_FORM_ID}
          />
          <div className={fulfillmentToggleTrack} />
          <span className="ms-2.5 text-xs font-medium text-blueNavy">Посещение</span>
        </label>
      </div>

      {businessTypeCheckboxOptions.length > 0 ? (
        <div className="mt-6 flex flex-col gap-2.5">
          <b className="text-[13px] font-bold text-blueNavy">Тип магазина</b>
          <div className="flex flex-col gap-2">
            {businessTypeCheckboxOptions.map(({ value, label }) => (
              <label
                key={value}
                className="inline-flex cursor-pointer items-center gap-2.5"
              >
                <input
                  type="checkbox"
                  name="businessTypes"
                  value={value}
                  defaultChecked={selectedBusinessTypes.has(value)}
                  form={CATALOG_ASIDE_FILTER_FORM_ID}
                  className="h-4 w-4 shrink-0 rounded border border-blue text-blue focus:ring-blue"
                />
                <span className="text-xs font-medium text-blueNavy">{label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-[35px] flex flex-col gap-3.5">
        <b className="text-base font-bold text-blueNavy">Название категории</b>
        <div className="flex flex-col">
          {nav.categories.map((root) => {
            const children = nav.childCategories
              .filter((c) => c.parentId === root.id)
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "ru"));
            const rootBranchActive = rootHighlightId === root.id;
            return (
              <Fragment key={root.id}>
                <Link
                  prefetch={false}
                  href={catalogCategoryPath(root.slug, storeSlug, catalogNav)}
                  className={categoryItemClass(rootBranchActive)}
                >
                  <Image
                    src="/mlavka/img/btn-arrow.svg"
                    alt=""
                    width={5}
                    height={8}
                    className={`shrink-0 ${rootBranchActive ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="min-w-0 truncate">
                    {root.name} ({root.count.toLocaleString("ru-RU")})
                  </span>
                </Link>
                {children.map((child) => {
                  const childActive = activeCategory === child.id;
                  return (
                    <Link
                      key={child.id}
                      prefetch={false}
                      href={catalogCategoryPath(child.slug, storeSlug, catalogNav)}
                      className={categoryItemClass(childActive)}
                    >
                      <Image
                        src="/mlavka/img/btn-arrow.svg"
                        alt=""
                        width={5}
                        height={8}
                        className={`shrink-0 ${childActive ? "opacity-100" : "opacity-0"}`}
                      />
                      <span className="min-w-0 truncate">
                        {child.name} ({child.count.toLocaleString("ru-RU")})
                      </span>
                    </Link>
                  );
                })}
              </Fragment>
            );
          })}
          <Link
            prefetch={false}
            href={catalogRootPath(storeSlug, catalogNav)}
            className={[
              categoryAllRowClass,
              allCategoriesActive ? "bg-blueExtraLight font-semibold" : "",
            ].join(" ")}
          >
            <Image
              src="/mlavka/img/btn-arrow.svg"
              alt=""
              width={5}
              height={8}
              className={`shrink-0 ${allCategoriesActive ? "opacity-100" : "opacity-0"}`}
            />
            Все категории
          </Link>
        </div>
      </div>

      <CatalogSortFilterBar
        layout="sidebar"
        basePath={filterBasePath}
        preserved={filterPreserved}
      />

      <div className="mt-6 flex w-full flex-col gap-2.5">
        <button
          type="submit"
          form={CATALOG_ASIDE_FILTER_FORM_ID}
          className="w-full rounded-md bg-blue py-[11px] text-[13px] font-bold text-white transition-colors hover:opacity-95"
        >
          Применить
        </button>
        <Link
          href={catalogSidebarFilterResetHref(filterBasePath, filterPreserved)}
          prefetch={false}
          className="inline-flex w-full items-center justify-center rounded-md border border-blueExtraLight bg-white py-[11px] text-center text-[13px] font-semibold text-blueNavy transition-colors hover:border-blue hover:text-blue"
        >
          Сбросить
        </Link>
      </div>

      <div className="mt-6 border-t border-blueExtraLight" aria-hidden />
    </aside>
  );
}
