"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback } from "react";
import {
  buildCatalogListQueryString,
  normalizeCatalogSort,
  type CatalogListQueryPreserved,
} from "@/lib/catalog-list-query";
import {
  CATALOG_ASIDE_FILTER_FORM_ID,
  catalogSidebarFilterResetHref,
} from "@/lib/catalog-sidebar-filters";

type Preserved = CatalogListQueryPreserved;

type Props = {
  /** Путь без query: `/catalog` или `/catalog/my-slug` */
  basePath: string;
  preserved: Preserved;
  /** Узкая колонка сайдбара: вертикальная вёрстка, без нижнего отступа блока */
  layout?: "default" | "sidebar";
};

export function CatalogSortFilterBar({
  basePath,
  preserved,
  layout = "default",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const minDefault = sp.get("minPrice") ?? "";
  const maxDefault = sp.get("maxPrice") ?? "";
  const sortDefault = normalizeCatalogSort(sp.get("sort") ?? undefined);
  const urlKey = `${minDefault}|${maxDefault}|${sortDefault}|${sp.get("offset") ?? ""}|${sp.getAll("fulfillment").join(",")}|${sp.getAll("businessTypes").join(",")}`;

  const store = preserved.store;
  const category = preserved.category;

  const onApply = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const min = String(fd.get("minPrice") ?? "");
      const max = String(fd.get("maxPrice") ?? "");
      const sort = String(fd.get("sort") ?? "new");
      const collectCheckedByFormId = (fieldName: string): string[] => {
        if (!form.id) return [];
        const controls = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            `input[type="checkbox"][name="${fieldName}"][form="${form.id}"]:checked`,
          ),
        );
        return controls.map((el) => el.value.trim()).filter(Boolean);
      };
      const nextFulfillment =
        layout === "sidebar"
          ? collectCheckedByFormId("fulfillment")
          : preserved.fulfillment;
      const nextBusinessTypes =
        layout === "sidebar"
          ? collectCheckedByFormId("businessTypes")
          : preserved.businessTypes;
      const q = buildCatalogListQueryString({
        preserved: {
          store,
          category,
          fulfillment: nextFulfillment,
          businessTypes: nextBusinessTypes,
        },
        minPrice: min,
        maxPrice: max,
        sort,
      });
      router.push(q ? `${basePath}?${q}` : basePath);
    },
    [basePath, category, layout, preserved.businessTypes, preserved.fulfillment, router, store],
  );

  const isSidebar = layout === "sidebar";

  const fieldClassSidebar =
    "w-full rounded-md border border-blueExtraLight bg-blueUltraLight py-[11px] ps-[9px] pe-6 text-[13px] font-medium text-blueNavy outline-none placeholder:text-blueSteel focus:border-blueLight focus-visible:border-blueLight";

  return (
    <div
      className={
        isSidebar
          ? "mt-5 flex flex-col gap-[25px]"
          : "mb-6 rounded-xl border border-blueExtraLight bg-white p-4 shadow-sm shadow-[#3458820f]"
      }
    >
      <form
        id={isSidebar ? CATALOG_ASIDE_FILTER_FORM_ID : undefined}
        key={urlKey}
        className={`flex flex-col ${isSidebar ? "gap-[25px]" : "gap-4"}`}
        onSubmit={onApply}
      >
        {isSidebar ? (
          <>
            <input type="hidden" name="sort" value={sortDefault} />
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] font-bold text-blueNavy">Цена</span>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative min-w-0">
                  <label htmlFor="catalog-min-price" className="sr-only">
                    Цена от
                  </label>
                  <input
                    id="catalog-min-price"
                    name="minPrice"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    defaultValue={minDefault}
                    placeholder="от"
                    className={fieldClassSidebar}
                  />
                  <span
                    className="pointer-events-none absolute end-[9px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-blueSteel"
                    aria-hidden
                  >
                    ₽
                  </span>
                </div>
                <div className="relative min-w-0">
                  <label htmlFor="catalog-max-price" className="sr-only">
                    Цена до
                  </label>
                  <input
                    id="catalog-max-price"
                    name="maxPrice"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    defaultValue={maxDefault}
                    placeholder="до"
                    className={fieldClassSidebar}
                  />
                  <span
                    className="pointer-events-none absolute end-[9px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-blueSteel"
                    aria-hidden
                  >
                    ₽
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="min-w-[120px] flex-1 flex flex-col gap-1">
              <span className="text-xs font-medium text-blueSteel">Цена от, ₽</span>
              <input
                name="minPrice"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                defaultValue={minDefault}
                placeholder="0"
                className="w-full rounded-lg border border-blueExtraLight px-3 py-2 text-sm text-blueNavy outline-none ring-blue focus-visible:ring-2"
              />
            </label>
            <label className="min-w-[120px] flex-1 flex flex-col gap-1">
              <span className="text-xs font-medium text-blueSteel">Цена до, ₽</span>
              <input
                name="maxPrice"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                defaultValue={maxDefault}
                placeholder="∞"
                className="w-full rounded-lg border border-blueExtraLight px-3 py-2 text-sm text-blueNavy outline-none ring-blue focus-visible:ring-2"
              />
            </label>
            <label className="min-w-[200px] flex-1 flex flex-col gap-1 sm:max-w-[260px]">
              <span className="text-xs font-medium text-blueSteel">Сортировка</span>
              <select
                name="sort"
                defaultValue={sortDefault}
                className="w-full rounded-lg border border-blueExtraLight bg-white px-3 py-2 text-sm text-blueNavy outline-none ring-blue focus-visible:ring-2"
              >
                <option value="new">Сначала новые</option>
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="name_asc">Название: А → Я</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2 sm:pb-0.5">
              <button
                type="submit"
                className="rounded-lg bg-blue px-5 py-2 text-sm font-bold text-white transition-colors hover:opacity-95"
              >
                Применить
              </button>
              <Link
                href={catalogSidebarFilterResetHref(basePath, preserved)}
                prefetch={false}
                className="inline-flex items-center justify-center rounded-lg border border-blueExtraLight bg-white px-4 py-2 text-sm font-semibold text-blueNavy transition-colors hover:border-blue hover:text-blue"
              >
                Сбросить фильтры
              </Link>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
