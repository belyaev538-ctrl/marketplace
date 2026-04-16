import { firstSearchParam } from "@/lib/search-params";

/** Фильтры списка товара, переносимые между страницами каталога (из searchParams). */
export type CatalogNavFilterSource = {
  minPrice?: string | string[];
  maxPrice?: string | string[];
  sort?: string | string[];
  fulfillment?: string | string[];
  /** Повторяющийся query `businessTypes=` — типы магазина (enum). */
  businessTypes?: string | string[];
  lat?: string | string[];
  lng?: string | string[];
  radiusKm?: string | string[];
};

export function pickCatalogNavFilters(pageSearchParams: {
  minPrice?: string | string[];
  maxPrice?: string | string[];
  sort?: string | string[];
  fulfillment?: string | string[];
  businessTypes?: string | string[];
  lat?: string | string[];
  lng?: string | string[];
  radiusKm?: string | string[];
}): CatalogNavFilterSource {
  return {
    minPrice: pageSearchParams.minPrice,
    maxPrice: pageSearchParams.maxPrice,
    sort: pageSearchParams.sort,
    fulfillment: pageSearchParams.fulfillment,
    businessTypes: pageSearchParams.businessTypes,
    lat: pageSearchParams.lat,
    lng: pageSearchParams.lng,
    radiusKm: pageSearchParams.radiusKm,
  };
}

/**
 * Объединяет базовые query-параметры с фильтрами каталога, сбрасывает offset.
 */
export function appendCatalogNavFilters(
  base: URLSearchParams,
  navFilters: CatalogNavFilterSource,
): string {
  const out = new URLSearchParams(base.toString());
  out.delete("offset");
  const min = firstSearchParam(navFilters.minPrice);
  const max = firstSearchParam(navFilters.maxPrice);
  const sort = firstSearchParam(navFilters.sort);
  const fulfillment = navFilters.fulfillment;
  const lat = firstSearchParam(navFilters.lat);
  const lng = firstSearchParam(navFilters.lng);
  const radiusKm = firstSearchParam(navFilters.radiusKm);
  if (min) out.set("minPrice", min);
  else out.delete("minPrice");
  if (max) out.set("maxPrice", max);
  else out.delete("maxPrice");
  if (sort) out.set("sort", sort);
  else out.delete("sort");
  out.delete("fulfillment");
  const arr = Array.isArray(fulfillment)
    ? fulfillment
    : fulfillment != null
      ? [fulfillment]
      : [];
  for (const f of arr) {
    const v = String(f).trim();
    if (v) out.append("fulfillment", v);
  }
  out.delete("businessTypes");
  const bt = Array.isArray(navFilters.businessTypes)
    ? navFilters.businessTypes
    : navFilters.businessTypes != null
      ? [navFilters.businessTypes]
      : [];
  for (const b of bt) {
    const v = String(b).trim();
    if (v) out.append("businessTypes", v);
  }
  if (lat) out.set("lat", lat);
  else out.delete("lat");
  if (lng) out.set("lng", lng);
  else out.delete("lng");
  if (radiusKm) out.set("radiusKm", radiusKm);
  else out.delete("radiusKm");
  return out.toString();
}

/** Ссылка на витрину категории по slug marketplace-категории. */
export function catalogCategoryPath(
  categorySlug: string,
  storeSlug?: string,
  navFilters?: CatalogNavFilterSource,
): string {
  const qs = new URLSearchParams();
  if (storeSlug) qs.set("store", storeSlug);
  const q =
    navFilters !== undefined ? appendCatalogNavFilters(qs, navFilters) : qs.toString();
  const path = `/catalog/${encodeURIComponent(categorySlug)}`;
  return q ? `${path}?${q}` : path;
}

export function catalogRootPath(storeSlug?: string, navFilters?: CatalogNavFilterSource): string {
  const qs = new URLSearchParams();
  if (storeSlug) qs.set("store", storeSlug);
  const q =
    navFilters !== undefined ? appendCatalogNavFilters(qs, navFilters) : qs.toString();
  return q ? `/catalog?${q}` : "/catalog";
}

/** `/catalog?category=<id>` — выбор категории по id на корневой странице каталога. */
export function catalogRootCategoryQueryPath(
  categoryId: string,
  storeSlug?: string,
  navFilters?: CatalogNavFilterSource,
): string {
  const qs = new URLSearchParams();
  qs.set("category", categoryId);
  if (storeSlug) qs.set("store", storeSlug);
  const q =
    navFilters !== undefined ? appendCatalogNavFilters(qs, navFilters) : qs.toString();
  return `/catalog?${q}`;
}
