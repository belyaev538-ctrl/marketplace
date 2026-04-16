/** Радиус «рядом с вами» (км), localStorage — отдельно от общего радиуса поиска на карте. */

export const NEAR_RADIUS_STORAGE_KEY = "marketplace-near-radius-km";

export const NEAR_RADIUS_KM_OPTIONS = [1, 2, 3, 5, 10, 15, 25, 50, 100, 200] as const;

export type NearRadiusKm = (typeof NEAR_RADIUS_KM_OPTIONS)[number];

const DEFAULT_KM: NearRadiusKm = 2;

function isOption(n: number): n is NearRadiusKm {
  return (NEAR_RADIUS_KM_OPTIONS as readonly number[]).includes(n);
}

export function getNearRadiusKm(): NearRadiusKm {
  if (typeof window === "undefined") return DEFAULT_KM;
  try {
    const raw = localStorage.getItem(NEAR_RADIUS_STORAGE_KEY);
    if (raw == null) return DEFAULT_KM;
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && isOption(n)) return n;
  } catch {
    /* ignore */
  }
  return DEFAULT_KM;
}

export function setNearRadiusKm(km: NearRadiusKm): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NEAR_RADIUS_STORAGE_KEY, String(km));
  window.dispatchEvent(new Event("near-radius-changed"));
}
