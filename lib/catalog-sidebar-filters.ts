import type { CatalogListQueryPreserved } from "@/lib/catalog-list-query";

/** Одна форма цены в сайдбаре каталога; кнопка «Применить» вынесена ниже блока атрибутов. */
export const CATALOG_ASIDE_FILTER_FORM_ID = "catalog-aside-filters-form";

export function catalogSidebarFilterResetHref(
  basePath: string,
  preserved: CatalogListQueryPreserved,
): string {
  const qs = new URLSearchParams();
  if (preserved.store) qs.set("store", preserved.store);
  if (preserved.category) qs.set("category", preserved.category);
  if (preserved.q) qs.set("q", preserved.q);
  if (preserved.lat) qs.set("lat", preserved.lat);
  if (preserved.lng) qs.set("lng", preserved.lng);
  if (preserved.radiusKm) qs.set("radiusKm", preserved.radiusKm);
  const q = qs.toString();
  return q ? `${basePath}?${q}` : basePath;
}
