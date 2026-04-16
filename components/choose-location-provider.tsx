"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChooseLocationContext } from "@/components/choose-location-context";
import { ChooseLocationView } from "@/components/choose-location-view";
import { getUserLocation, setUserLocation } from "@/lib/user-location";

const FIRST_VISIT_LOCATION_HINT_KEY = "marketplace-first-visit-location-hint-shown";
const AUTO_GEO_TIMEOUT_MS = 2800;

function ChooseLocationModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="choose-location-title"
        className="relative w-full max-w-[1125px] rounded-2xl bg-white px-8 pb-[50px] pt-8 shadow-xl min-[1200px]:h-[822px]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="group absolute right-[25px] top-[25px] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-[#3E6897] shadow-none transition-colors hover:bg-blue hover:text-white"
          aria-label="Закрыть"
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden className="h-10 w-10">
            <circle
              cx="20"
              cy="20"
              r="19.5"
              fill="currentColor"
              fillOpacity="0.08"
              className="transition-[fill,stroke] group-hover:fill-white/20"
            />
            <rect
              x="23.8828"
              y="14.3027"
              width="2"
              height="13"
              rx="1"
              transform="rotate(45 23.8828 14.3027)"
              fill="currentColor"
            />
            <rect
              x="25.2969"
              y="23.4961"
              width="2"
              height="13"
              rx="1"
              transform="rotate(135 25.2969 23.4961)"
              fill="currentColor"
            />
          </svg>
        </button>
        <ChooseLocationView variant="dialog" onClose={onClose} />
      </div>
    </div>
  );
}

function ChooseLocationConfirmModal({
  cityName,
  onConfirm,
  onReject,
}: {
  cityName: string;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm sm:items-center sm:py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Подтвердите ваш город"
        className="w-full max-w-[760px] rounded-2xl bg-white px-6 py-8 shadow-xl sm:px-10 sm:py-10"
      >
        <p className="text-[34px] font-extrabold text-blueNavy">
          Ваш город <span className="font-black text-blue">{cityName}</span>, все верно?
        </p>
        <div className="mt-7 flex flex-col gap-4 sm:flex-row">
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-[74px] w-full items-center justify-center rounded-[30px] bg-blue text-[46px] font-medium text-white transition-opacity hover:opacity-95 sm:w-[334px]"
          >
            Да
          </button>
          <button
            type="button"
            onClick={onReject}
            className="inline-flex h-[74px] w-full items-center justify-center rounded-[30px] border-2 border-[#6885A8] bg-white text-[46px] font-medium text-[#396596] transition-colors hover:bg-blueUltraLight sm:w-[334px]"
          >
            Нет
          </button>
        </div>
        <div className="mt-9 border-t border-blueExtraLight pt-6">
          <p className="text-[28px] font-medium leading-[1.25] text-blueNavy">
            Укажите местоположение, а так же задайте радиус поиска и мы покажем вам товары и магазин по вашим
            параметрам
          </p>
        </div>
      </div>
    </div>
  );
}

function isValidGeo(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function ChooseLocationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [isOpen, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ lat: number; lng: number; cityName: string } | null>(null);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  useEffect(() => {
    if (pathname === "/choose-location") return;
    let shouldCheckLocation = true;
    try {
      const wasShown = localStorage.getItem(FIRST_VISIT_LOCATION_HINT_KEY) === "1";
      if (wasShown) shouldCheckLocation = false;
      else localStorage.setItem(FIRST_VISIT_LOCATION_HINT_KEY, "1");
    } catch {
      // В приватных режимах доступ к localStorage может быть недоступен.
      // В этом случае всё равно показываем подсказку, если локация ещё не выбрана.
    }
    if (!shouldCheckLocation || getUserLocation() != null) return;

    let cancelled = false;
    const openManualPick = () => {
      if (!cancelled) setOpen(true);
    };

    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as { name?: string | null };
        const cityName = typeof data.name === "string" ? data.name.trim() : "";
        if (!cancelled && res.ok && cityName) {
          setConfirm({ lat, lng, cityName });
          return;
        }
      } catch {
        /* ignore */
      }
      openManualPick();
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      openManualPick();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!isValidGeo(lat, lng)) {
          openManualPick();
          return;
        }
        void reverseGeocode(lat, lng);
      },
      () => openManualPick(),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: AUTO_GEO_TIMEOUT_MS },
    );

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const confirmDetectedLocation = useCallback(() => {
    if (!confirm) return;
    setUserLocation(confirm.lat, confirm.lng, {
      source: "auto",
      queryText: confirm.cityName,
      nearbyLabel: confirm.cityName,
    });
    setConfirm(null);
  }, [confirm]);

  const rejectDetectedLocation = useCallback(() => {
    setConfirm(null);
    setOpen(true);
  }, []);

  return (
    <ChooseLocationContext.Provider value={value}>
      {children}
      {confirm ? (
        <ChooseLocationConfirmModal
          cityName={confirm.cityName}
          onConfirm={confirmDetectedLocation}
          onReject={rejectDetectedLocation}
        />
      ) : null}
      {isOpen ? <ChooseLocationModal onClose={close} /> : null}
    </ChooseLocationContext.Provider>
  );
}
