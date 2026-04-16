"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, type ChangeEvent } from "react";
import {
  buildCatalogListQueryString,
  formatCatalogProductCount,
  normalizeCatalogSort,
  type CatalogListQueryPreserved,
  type CatalogSortValue,
} from "@/lib/catalog-list-query";

const SORT_LABELS: Record<CatalogSortValue, string> = {
  new: "Популярные",
  price_asc: "Дешевле",
  price_desc: "Дороже",
  name_asc: "По названию",
};

type Props = {
  total: number;
  basePath: string;
  preserved: CatalogListQueryPreserved;
};

export function CatalogProductsToolbar({ total, basePath, preserved }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const minPrice = sp.get("minPrice") ?? "";
  const maxPrice = sp.get("maxPrice") ?? "";
  const sort = normalizeCatalogSort(sp.get("sort") ?? undefined);

  const hrefForSort = useCallback(
    (next: CatalogSortValue) => {
      const q = buildCatalogListQueryString({
        preserved,
        minPrice,
        maxPrice,
        sort: next,
      });
      return q ? `${basePath}?${q}` : basePath;
    },
    [basePath, maxPrice, minPrice, preserved],
  );

  const onSortChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const next = normalizeCatalogSort(e.target.value);
      router.push(hrefForSort(next));
    },
    [hrefForSort, router],
  );

  const countLine = useMemo(() => formatCatalogProductCount(total), [total]);

  return (
    <div className="mb-4 hidden items-center justify-between border-b border-graySoft pb-[15px] lg:flex">
      <span className="text-[13px] font-medium text-blueNavy">{countLine}</span>
      <label htmlFor="catalog-toolbar-sort" className="sr-only">
        Сортировка
      </label>
      <select
        id="catalog-toolbar-sort"
        value={sort}
        onChange={onSortChange}
        className="w-[158px] cursor-pointer appearance-none rounded-md border border-blueExtraLight bg-white bg-[length:10px_6px] bg-[right_10px_center] bg-no-repeat py-3 ps-2.5 pe-8 text-xs font-medium text-blueSteel outline-none focus:border-blueLight"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 10 6'%3E%3Cpath stroke='%233E6897' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 1 4 4 4-4'/%3E%3C/svg%3E")`,
        }}
      >
        {(Object.keys(SORT_LABELS) as CatalogSortValue[]).map((v) => (
          <option key={v} value={v}>
            {SORT_LABELS[v]}
          </option>
        ))}
      </select>
    </div>
  );
}
