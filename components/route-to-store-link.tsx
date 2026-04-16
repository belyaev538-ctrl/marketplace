"use client";

import { useMemo } from "react";
import { getUserLocation } from "@/lib/user-location";

type Props = {
  storeLatitude: number | null;
  storeLongitude: number | null;
  storeAddress: string | null;
  storeName: string;
  className: string;
  children: React.ReactNode;
};

function validCoord(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function RouteToStoreLink({
  storeLatitude,
  storeLongitude,
  storeAddress,
  storeName,
  className,
  children,
}: Props) {
  const href = useMemo(() => {
    const user = getUserLocation();
    if (user && validCoord(storeLatitude) && validCoord(storeLongitude)) {
      return `https://yandex.ru/maps/?rtext=${encodeURIComponent(
        `${user.lat},${user.lng}`,
      )}~${encodeURIComponent(`${storeLatitude},${storeLongitude}`)}&rtt=auto`;
    }
    return `https://yandex.ru/maps/?rtext=${encodeURIComponent("ваша локация")}~${encodeURIComponent(
      storeAddress?.trim() || storeName,
    )}&rtt=auto`;
  }, [storeAddress, storeLatitude, storeLongitude, storeName]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        const user = getUserLocation();
        const nextHref =
          user && validCoord(storeLatitude) && validCoord(storeLongitude)
            ? `https://yandex.ru/maps/?rtext=${encodeURIComponent(
                `${user.lat},${user.lng}`,
              )}~${encodeURIComponent(`${storeLatitude},${storeLongitude}`)}&rtt=auto`
            : `https://yandex.ru/maps/?rtext=${encodeURIComponent("ваша локация")}~${encodeURIComponent(
                storeAddress?.trim() || storeName,
              )}&rtt=auto`;
        window.open(nextHref, "_blank", "noopener,noreferrer");
      }}
    >
      {children}
    </a>
  );
}

