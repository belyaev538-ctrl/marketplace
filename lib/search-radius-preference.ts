/** Радиус поиска на карте товара (км), localStorage. */

export const SEARCH_RADIUS_STORAGE_KEY = "marketplace-search-radius-km";
export const SEARCH_RADIUS_COOKIE_KEY = "marketplace-search-radius-km";

export const SEARCH_RADIUS_KM_OPTIONS = [1, 2, 3, 5, 10, 15, 25, 30, 50, 100, 200] as const;

export type SearchRadiusKm = (typeof SEARCH_RADIUS_KM_OPTIONS)[number];

const DEFAULT_KM: SearchRadiusKm = 5;

function isOption(n: number): n is SearchRadiusKm {
  return (SEARCH_RADIUS_KM_OPTIONS as readonly number[]).includes(n);
}

export function getSearchRadiusKm(): SearchRadiusKm {
  if (typeof window === "undefined") return DEFAULT_KM;
  try {
    const raw = localStorage.getItem(SEARCH_RADIUS_STORAGE_KEY);
    if (raw == null) return DEFAULT_KM;
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && isOption(n)) return n;
  } catch {
    /* ignore */
  }
  return DEFAULT_KM;
}

export function setSearchRadiusKm(km: SearchRadiusKm): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEARCH_RADIUS_STORAGE_KEY, String(km));
  if (typeof document !== "undefined") {
    const maxAgeSeconds = 60 * 60 * 24 * 30;
    document.cookie = `${SEARCH_RADIUS_COOKIE_KEY}=${encodeURIComponent(String(km))}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
  }
  window.dispatchEvent(new Event("search-radius-changed"));
}
