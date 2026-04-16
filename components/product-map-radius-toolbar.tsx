"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChooseLocationOptional } from "@/components/choose-location-context";
import { getUserLocation } from "@/lib/user-location";
import {
  SEARCH_RADIUS_KM_OPTIONS,
  type SearchRadiusKm,
  setSearchRadiusKm,
} from "@/lib/search-radius-preference";

type Props = {
  radiusKm: SearchRadiusKm;
  onRadiusKmChange: (km: SearchRadiusKm) => void;
};

const pointLinkClassName =
  "flex shrink-0 items-center gap-1.5 text-left text-[10px] font-medium leading-none text-blueNavy transition-colors hover:text-blue sm:gap-2 sm:text-xs";

function resolveToolbarLocationLabel(): string {
  const loc = getUserLocation();
  if (!loc) return "Укажите местоположение";
  if (loc.nearbyLabel) return `Рядом с ${loc.nearbyLabel}`;
  return "Мое местоположение";
}

export function ProductMapRadiusToolbar({ radiusKm, onRadiusKmChange }: Props) {
  const choose = useChooseLocationOptional();
  const [locationLabel, setLocationLabel] = useState("Укажите местоположение");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setLocationLabel(resolveToolbarLocationLabel());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("user-location-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("user-location-changed", sync);
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const select = useCallback(
    (km: SearchRadiusKm) => {
      setSearchRadiusKm(km);
      onRadiusKmChange(km);
      setOpen(false);
    },
    [onRadiusKmChange],
  );

  return (
    <div
      ref={wrapRef}
      className="pointer-events-auto absolute right-[15px] top-[15px] z-20 flex h-[41px] max-w-[min(calc(100%-30px),420px)] min-w-0 items-center gap-2 rounded-[6px] bg-white/90 px-2.5 py-1 shadow-[0_15px_35px_rgba(52,88,130,0.35)] backdrop-blur-sm sm:gap-3 sm:px-3"
    >
      {choose ? (
        <button
          type="button"
          onClick={() => choose.open()}
          className={pointLinkClassName}
          aria-label={locationLabel === "Укажите местоположение" ? "Укажите местоположение" : "Изменить местоположение"}
        >
          <Image
            src="/mlavka/img/map-icon.svg"
            alt=""
            width={18}
            height={18}
            className="h-[16px] w-[16px] shrink-0 sm:h-[18px] sm:w-[18px]"
          />
          <span className="min-w-0 max-w-[175px] truncate sm:max-w-[220px]">{locationLabel}</span>
        </button>
      ) : (
        <Link
          href="/choose-location"
          prefetch={false}
          className={pointLinkClassName}
          aria-label={locationLabel === "Укажите местоположение" ? "Укажите местоположение" : "Изменить местоположение"}
        >
          <Image
            src="/mlavka/img/map-icon.svg"
            alt=""
            width={18}
            height={18}
            className="h-[16px] w-[16px] shrink-0 sm:h-[18px] sm:w-[18px]"
          />
          <span className="min-w-0 max-w-[175px] truncate sm:max-w-[220px]">{locationLabel}</span>
        </Link>
      )}

      <div className="relative min-w-0 flex-1 sm:flex-initial">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex w-full min-w-[72px] items-center justify-end gap-1 whitespace-nowrap rounded-[3px] px-1.5 py-1 text-[10px] font-medium text-blueNavy transition-colors hover:text-blue sm:min-w-[88px] sm:gap-1.5 sm:text-xs"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <Image src="/icon/rad.svg" alt="" width={15} height={15} className="h-[15px] w-[15px] shrink-0" />
          <span>{radiusKm} км.</span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path
              d="m1 1 4 4 4-4"
              stroke="#0075FF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open ? (
          <ul
            className="absolute end-0 top-[calc(100%+4px)] z-30 min-w-full overflow-hidden rounded-lg border border-blueExtraLight bg-white py-1 shadow-lg"
            role="listbox"
          >
            {SEARCH_RADIUS_KM_OPTIONS.map((km) => (
              <li key={km} role="option" aria-selected={km === radiusKm}>
                <button
                  type="button"
                  onClick={() => select(km)}
                  className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-blueUltraLight ${
                    km === radiusKm ? "bg-blueUltraLight text-blue" : "text-blueNavy"
                  }`}
                >
                  {km} км
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
