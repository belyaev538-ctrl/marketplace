"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useChooseLocationOptional } from "@/components/choose-location-context";
import { getUserLocation } from "@/lib/user-location";
import { getSearchRadiusKm } from "@/lib/search-radius-preference";

const linkClassName =
  "flex max-w-[220px] items-center gap-2 text-left text-[10px] font-medium leading-none text-blueNavy transition-colors hover:text-blue md:max-w-full md:gap-1.5 md:text-xs md:text-blue";

function resolveHeaderLocationLabel(): string {
  const loc = getUserLocation();
  if (!loc) return "Укажите местоположение";
  if (loc.nearbyLabel) return `Вы рядом с ${loc.nearbyLabel}`;
  return "Мое местоположение";
}

export function HeaderUserLocationLink() {
  const choose = useChooseLocationOptional();
  const [label, setLabel] = useState("Укажите местоположение");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setLabel(resolveHeaderLocationLabel());
    const syncRadius = () => setRadiusKm(getSearchRadiusKm());
    sync();
    syncRadius();
    window.addEventListener("storage", sync);
    window.addEventListener("storage", syncRadius);
    window.addEventListener("user-location-changed", sync);
    window.addEventListener("search-radius-changed", syncRadius);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("storage", syncRadius);
      window.removeEventListener("user-location-changed", sync);
      window.removeEventListener("search-radius-changed", syncRadius);
    };
  }, []);

  const ariaLabel = label === "Укажите местоположение" ? "Укажите местоположение" : "Изменить местоположение";
  const content = (
    <>
      <Image
        src="/mlavka/img/map-icon.svg"
        alt=""
        width={18}
        height={18}
        className="h-[18px] w-[18px] shrink-0"
      />
      <span className="min-w-0 max-w-[160px] truncate">{label}</span>
      <span className="ms-1 inline-flex items-center gap-1.5 text-[11px] text-blueNavy md:text-xs">
        <Image src="/icon/rad.svg" alt="" width={15} height={15} className="h-[15px] w-[15px]" />
        <span suppressHydrationWarning>{radiusKm == null ? "— км." : `${radiusKm} км.`}</span>
      </span>
    </>
  );

  if (choose) {
    return (
      <button
        type="button"
        onClick={() => choose.open()}
        className={linkClassName}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href="/choose-location" prefetch={false} className={linkClassName} aria-label={ariaLabel}>
      {content}
    </Link>
  );
}
