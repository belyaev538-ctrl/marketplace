/** Средний радиус Земли (км) для приближённого расстояния по сфере. */
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Расстояние между двумя точками на сфере (км), формула гаверсинусов. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function isWithinRadiusKm(
  center: { lat: number; lng: number },
  point: { latitude: number; longitude: number },
  radiusKm: number,
): boolean {
  if (!(radiusKm > 0) || !Number.isFinite(radiusKm)) return true;
  return distanceKm(center.lat, center.lng, point.latitude, point.longitude) <= radiusKm;
}

/** Оставляет только строки, чьи координаты не дальше `radiusKm` от центра. */
export function filterByRadiusKm<T extends { latitude: number; longitude: number }>(
  rows: T[],
  center: { lat: number; lng: number },
  radiusKm: number,
): T[] {
  if (!(radiusKm > 0) || !Number.isFinite(radiusKm)) return rows;
  return rows.filter((r) => isWithinRadiusKm(center, r, radiusKm));
}
