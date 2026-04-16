import { filterByRadiusKm } from "@/lib/geo-distance";
import { catalogListableStoreWithCoordsWhere } from "@/lib/catalog-products-query";
import { prisma } from "@/lib/prisma";
import { firstSearchParam } from "@/lib/search-params";

export type CatalogGeoRadius = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export function parseCatalogGeoRadiusFromSearchParams(searchParams: {
  lat?: string | string[];
  lng?: string | string[];
  radiusKm?: string | string[];
}): CatalogGeoRadius | null {
  const lat = Number.parseFloat(firstSearchParam(searchParams.lat) ?? "");
  const lng = Number.parseFloat(firstSearchParam(searchParams.lng) ?? "");
  const radiusKm = Number.parseFloat(firstSearchParam(searchParams.radiusKm) ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm) || radiusKm <= 0) {
    return null;
  }
  return { lat, lng, radiusKm };
}

export async function getStoreIdsInCatalogGeoRadius(geo: CatalogGeoRadius): Promise<string[]> {
  const storesWithCoords = await prisma.store.findMany({
    where: catalogListableStoreWithCoordsWhere(),
    select: { id: true, latitude: true, longitude: true },
  });
  return filterByRadiusKm(
    storesWithCoords
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({
        id: s.id,
        latitude: s.latitude as number,
        longitude: s.longitude as number,
      })),
    { lat: geo.lat, lng: geo.lng },
    geo.radiusKm,
  ).map((s) => s.id);
}
