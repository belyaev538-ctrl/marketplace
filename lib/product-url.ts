/** Первый сегмент пути не должен совпадать с этими (иначе это не «магазин/товар»). */
export const PRODUCT_URL_RESERVED_FIRST_SEGMENTS = new Set([
  "admin",
  "api",
  "catalog",
  "product",
  "map",
  "stores",
  "search",
  "login",
  "choose-location",
  "dashboard",
  "_next",
]);

/** Два сегмента `/a/b` без зарезервированного первого — вероятно карточка товара. */
export function pathnameLooksLikeStoreProductPage(pathname: string): boolean {
  const p = (pathname.split("?")[0] ?? "").replace(/\/+$/, "") || "";
  const m = p.match(/^\/([^/]+)\/([^/]+)$/);
  if (!m) return false;
  return !PRODUCT_URL_RESERVED_FIRST_SEGMENTS.has(m[1].toLowerCase());
}

/**
 * Канонический путь карточки товара: /{storeSlug}/{productSlug}.
 * Если storeSlug неизвестен — запасной /product/{productSlug} (совместимость).
 */
export function productPublicPath(
  storeSlug: string | null | undefined,
  productSlug: string | null | undefined,
): string | null {
  const ps = (productSlug ?? "").trim();
  if (!ps) return null;
  const ss = (storeSlug ?? "").trim();
  if (ss) {
    return `/${encodeURIComponent(ss)}/${encodeURIComponent(ps)}`;
  }
  return `/product/${encodeURIComponent(ps)}`;
}
