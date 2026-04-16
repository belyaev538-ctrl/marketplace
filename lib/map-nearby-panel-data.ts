import type { StoreBusinessType } from "@prisma/client";
import { catalogListableStoreWithCoordsWhere } from "@/lib/catalog-products-query";
import { prisma } from "@/lib/prisma";
import { filterByRadiusKm } from "@/lib/geo-distance";
import {
  getHomeMarketplaceCategoriesWithCountsForStoreIds,
  getMarketplaceChildCategoriesWithCountsByParentSlugForStoreIds,
  type MarketplaceCategoryHomeItem,
} from "@/lib/marketplace-catalog-categories";
import { buildStoreBusinessTypeTilesForMap, type StoreBusinessTypeTileDTO } from "@/lib/store-business-type";

export type MapNearbyPanelPayload = {
  categories: MarketplaceCategoryHomeItem[];
  storeBusinessTypeTiles: StoreBusinessTypeTileDTO[];
};

/**
 * Категории и типы магазинов для /map/categories с учётом радиуса от (lat, lng).
 * Те же магазины, что и маркеры витрины (листинг + координаты), не дальше radiusKm.
 */
export async function getMapNearbyPanelData(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<MapNearbyPanelPayload> {
  const rows = await prisma.store.findMany({
    where: catalogListableStoreWithCoordsWhere(),
    select: {
      id: true,
      latitude: true,
      longitude: true,
      businessTypes: true,
    },
  });

  const withCoords = rows.filter(
    (r): r is typeof r & { latitude: number; longitude: number } =>
      r.latitude != null &&
      r.longitude != null &&
      Number.isFinite(r.latitude) &&
      Number.isFinite(r.longitude),
  );

  const inRadius = filterByRadiusKm(
    withCoords.map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
      businessTypes: r.businessTypes as StoreBusinessType[],
    })),
    { lat, lng },
    radiusKm,
  );

  const storeIdsInRadius = inRadius.map((r) => r.id);

  const categories = await getHomeMarketplaceCategoriesWithCountsForStoreIds(storeIdsInRadius);

  const facetRows = inRadius.map((s) => ({
    businessTypes: s.businessTypes as StoreBusinessType[],
  }));
  const storeBusinessTypeTiles = buildStoreBusinessTypeTilesForMap(facetRows, facetRows);

  return { categories, storeBusinessTypeTiles };
}

export async function getMapNearbyChildCategoriesData(
  lat: number,
  lng: number,
  radiusKm: number,
  parentCategorySlug: string,
): Promise<MarketplaceCategoryHomeItem[]> {
  const rows = await prisma.store.findMany({
    where: catalogListableStoreWithCoordsWhere(),
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });
  const withCoords = rows.filter(
    (r): r is typeof r & { latitude: number; longitude: number } =>
      r.latitude != null &&
      r.longitude != null &&
      Number.isFinite(r.latitude) &&
      Number.isFinite(r.longitude),
  );
  const inRadius = filterByRadiusKm(
    withCoords.map((r) => ({
      id: r.id,
      latitude: r.latitude,
      longitude: r.longitude,
    })),
    { lat, lng },
    radiusKm,
  );
  return getMarketplaceChildCategoriesWithCountsByParentSlugForStoreIds(
    parentCategorySlug,
    inRadius.map((s) => s.id),
  );
}
