/** Локальное хранилище выбранной точки пользователя (браузер). */

export const USER_LOCATION_STORAGE_KEY = "marketplace-user-location";
export const USER_LOCATION_LAT_COOKIE_KEY = "marketplace-user-lat";
export const USER_LOCATION_LNG_COOKIE_KEY = "marketplace-user-lng";

export type UserLocation = {
  lat: number;
  lng: number;
  /** Текст для шапки: например "г. Севастополь" или "п. Любимовка". */
  nearbyLabel?: string;
  /** Текст последнего ввода в поле поиска локации. */
  queryText?: string;
  /** Источник выбора точки. */
  source?: "manual" | "map" | "auto";
};

function isValidPair(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function getUserLocation(): UserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (o && typeof o === "object" && "lat" in o && "lng" in o) {
      const lat = (o as { lat: unknown }).lat;
      const lng = (o as { lng: unknown }).lng;
      if (isValidPair(lat, lng)) {
        const nearbyLabel =
          "nearbyLabel" in o && typeof (o as { nearbyLabel?: unknown }).nearbyLabel === "string"
            ? (o as { nearbyLabel: string }).nearbyLabel.trim()
            : "";
        const queryText =
          "queryText" in o && typeof (o as { queryText?: unknown }).queryText === "string"
            ? (o as { queryText: string }).queryText.trim()
            : "";
        const sourceRaw =
          "source" in o && typeof (o as { source?: unknown }).source === "string"
            ? (o as { source: string }).source
            : "";
        const source =
          sourceRaw === "manual" || sourceRaw === "map" || sourceRaw === "auto"
            ? sourceRaw
            : undefined;
        return {
          lat: lat as number,
          lng: lng as number,
          ...(nearbyLabel ? { nearbyLabel } : {}),
          ...(queryText ? { queryText } : {}),
          ...(source ? { source } : {}),
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setUserLocation(
  lat: number,
  lng: number,
  meta?: { nearbyLabel?: string; queryText?: string; source?: "manual" | "map" | "auto" },
): void {
  if (typeof window === "undefined") return;
  if (!isValidPair(lat, lng)) return;
  const nearbyLabel = meta?.nearbyLabel?.trim() ?? "";
  const queryText = meta?.queryText?.trim() ?? "";
  localStorage.setItem(
    USER_LOCATION_STORAGE_KEY,
    JSON.stringify({
      lat,
      lng,
      ...(nearbyLabel ? { nearbyLabel } : {}),
      ...(queryText ? { queryText } : {}),
      ...(meta?.source ? { source: meta.source } : {}),
    }),
  );
  if (typeof document !== "undefined") {
    const maxAgeSeconds = 60 * 60 * 24 * 30;
    document.cookie = `${USER_LOCATION_LAT_COOKIE_KEY}=${encodeURIComponent(String(lat))}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
    document.cookie = `${USER_LOCATION_LNG_COOKIE_KEY}=${encodeURIComponent(String(lng))}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
  }
  window.dispatchEvent(new Event("user-location-changed"));
}

export function clearUserLocation(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_LOCATION_STORAGE_KEY);
  if (typeof document !== "undefined") {
    document.cookie = `${USER_LOCATION_LAT_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${USER_LOCATION_LNG_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
  window.dispatchEvent(new Event("user-location-changed"));
}
