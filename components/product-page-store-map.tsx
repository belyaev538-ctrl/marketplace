"use client";

import { useEffect, useState } from "react";
import { YandexMap } from "@/components/map/yandex-map";
import { ProductMapRadiusToolbar } from "@/components/product-map-radius-toolbar";
import {
  getSearchRadiusKm,
  type SearchRadiusKm,
} from "@/lib/search-radius-preference";
import { getUserLocation, type UserLocation } from "@/lib/user-location";

type Props = {
  storeName: string;
  storeSlug: string;
  storeLogoUrl?: string | null;
  latitude: number | null;
  longitude: number | null;
};

function validCoord(lat: number | null, lng: number | null): boolean {
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

/** Правая колонка страницы товара: Яндекс.Карта с точкой магазина. */
export function ProductPageStoreMap({
  storeName,
  storeSlug,
  storeLogoUrl,
  latitude,
  longitude,
}: Props) {
  const ok = validCoord(latitude, longitude);
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
    setRadiusKm(getSearchRadiusKm());
    const onR = () => setRadiusKm(getSearchRadiusKm());
    window.addEventListener("search-radius-changed", onR);
    return () => window.removeEventListener("search-radius-changed", onR);
  }, []);

  return (
    <aside
      className="relative flex w-full min-h-[280px] shrink-0 flex-col bg-[#E8EAEE] lg:min-h-[100dvh] lg:sticky lg:top-0"
      aria-label={ok ? "Карта магазина" : "Карта недоступна"}
    >
      {ok ? (
        <div className="relative w-full min-h-[280px] flex-1 lg:min-h-0">
          <YandexMap
            fill
            embedAside
            hideMapControls
            useProductStoreMarker
            userLocation={userLocation ?? undefined}
            searchRadiusKm={userLocation ? radiusKm : 0}
            stores={[
              {
                name: storeName,
                slug: storeSlug,
                logoUrl: storeLogoUrl ?? null,
                latitude: latitude as number,
                longitude: longitude as number,
              },
            ]}
          />
          <ProductMapRadiusToolbar radiusKm={radiusKm} onRadiusKmChange={setRadiusKm} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10">
          <div className="h-16 w-16 rounded-lg bg-[#D1D5DB]" aria-hidden />
          <p className="max-w-[240px] text-center text-[13px] font-medium leading-snug text-blueSteel">
            Координаты магазина не указаны — точка на карте появится после сохранения широты и долготы в
            настройках магазина.
          </p>
        </div>
      )}
    </aside>
  );
}
