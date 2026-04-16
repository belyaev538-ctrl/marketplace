"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductMapRadiusToolbar } from "@/components/product-map-radius-toolbar";
import { YandexMap, type YandexMapStorePoint } from "@/components/map/yandex-map";
import { filterByRadiusKm } from "@/lib/geo-distance";
import {
  getSearchRadiusKm,
  type SearchRadiusKm,
} from "@/lib/search-radius-preference";
import { getUserLocation, type UserLocation } from "@/lib/user-location";

type Props = {
  stores: YandexMapStorePoint[];
  fill?: boolean;
  /**
   * Как на карточке товара: фон колонки #E8EAEE, без контролов API, круг радиуса и тулбар
   * «Радиус поиска» при сохранённой точке пользователя.
   */
  productCardStyle?: boolean;
  /**
   * Оставить на карте только магазины в пределах радиуса поиска от сохранённой точки пользователя.
   */
  filterStoresInSearchRadius?: boolean;
  /**
   * Slug-ы магазинов, которые нужно подсветить на карте.
   */
  highlightedStoreSlugs?: string[];
};

/** Карта магазинов + сохранённая точка «Вы здесь» из localStorage (только клиент). */
export function StoresMapWithUserLocation({
  stores,
  fill,
  productCardStyle,
  filterStoresInSearchRadius = false,
  highlightedStoreSlugs = [],
}: Props) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [radiusKm, setRadiusKm] = useState<SearchRadiusKm>(5);

  useEffect(() => {
    const sync = () => setUserLocation(getUserLocation());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("user-location-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("user-location-changed", sync);
    };
  }, []);

  useEffect(() => {
    if (!productCardStyle && !filterStoresInSearchRadius) return;
    setRadiusKm(getSearchRadiusKm());
    const onR = () => setRadiusKm(getSearchRadiusKm());
    window.addEventListener("search-radius-changed", onR);
    return () => window.removeEventListener("search-radius-changed", onR);
  }, [productCardStyle, filterStoresInSearchRadius]);

  const storesForMap = useMemo(() => {
    if (!filterStoresInSearchRadius || !userLocation) return stores;
    const inRadius = filterByRadiusKm(stores, userLocation, radiusKm);
    /** В режиме радиуса показываем только точки в радиусе; при пустом списке карта остаётся на точке пользователя. */
    return inRadius;
  }, [filterStoresInSearchRadius, stores, userLocation, radiusKm]);

  const map = (
    <YandexMap
      stores={storesForMap}
      fill={fill}
      embedAside={Boolean(productCardStyle)}
      hideMapControls={Boolean(productCardStyle)}
      userLocation={userLocation ?? undefined}
      searchRadiusKm={
        productCardStyle && userLocation ? radiusKm : 0
      }
      highlightedStoreSlugs={highlightedStoreSlugs}
    />
  );

  if (productCardStyle) {
    return (
      <div className="relative w-full min-h-[280px] flex-1 lg:min-h-0">
        {map}
        <ProductMapRadiusToolbar radiusKm={radiusKm} onRadiusKmChange={setRadiusKm} />
      </div>
    );
  }

  return map;
}
