"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSearchRadiusKm } from "@/lib/search-radius-preference";
import { getUserLocation } from "@/lib/user-location";

export function CatalogGeoSync() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const syncGeoIntoUrl = useCallback(() => {
    const loc = getUserLocation();
    if (!loc) return false;
    const radiusKm = getSearchRadiusKm();
    const currentLat = Number.parseFloat((searchParams.get("lat") ?? "").trim());
    const currentLng = Number.parseFloat((searchParams.get("lng") ?? "").trim());
    const currentRadius = Number.parseFloat((searchParams.get("radiusKm") ?? "").trim());
    const geoIsAlreadySynced =
      Number.isFinite(currentLat) &&
      Number.isFinite(currentLng) &&
      Number.isFinite(currentRadius) &&
      Math.abs(currentLat - loc.lat) < 1e-7 &&
      Math.abs(currentLng - loc.lng) < 1e-7 &&
      Math.abs(currentRadius - radiusKm) < 1e-7;
    if (geoIsAlreadySynced) return false;

    const next = new URLSearchParams(searchParams.toString());
    next.set("lat", String(loc.lat));
    next.set("lng", String(loc.lng));
    next.set("radiusKm", String(radiusKm));
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    return true;
  }, [pathname, router, searchParams]);

  useEffect(() => {
    void syncGeoIntoUrl();
  }, [syncGeoIntoUrl]);

  useEffect(() => {
    const onGeoChanged = () => {
      void syncGeoIntoUrl();
    };
    window.addEventListener("user-location-changed", onGeoChanged);
    window.addEventListener("search-radius-changed", onGeoChanged);
    window.addEventListener("storage", onGeoChanged);
    return () => {
      window.removeEventListener("user-location-changed", onGeoChanged);
      window.removeEventListener("search-radius-changed", onGeoChanged);
      window.removeEventListener("storage", onGeoChanged);
    };
  }, [pathname, syncGeoIntoUrl]);

  return null;
}
