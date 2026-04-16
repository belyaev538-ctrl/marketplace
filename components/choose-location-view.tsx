"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { YandexMap } from "@/components/map/yandex-map";
import {
  getNearRadiusKm,
  NEAR_RADIUS_KM_OPTIONS,
  setNearRadiusKm,
  type NearRadiusKm,
} from "@/lib/near-radius-preference";
import {
  getSearchRadiusKm,
  SEARCH_RADIUS_KM_OPTIONS,
  setSearchRadiusKm,
  type SearchRadiusKm,
} from "@/lib/search-radius-preference";
import { getUserLocation, setUserLocation } from "@/lib/user-location";

const DEFAULT_CENTER: [number, number] = [44.61665, 33.52536];

type Session = {
  center: [number, number];
  initialPick: { lat: number; lng: number } | null;
};

function validGeo(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

type Props = {
  variant?: "page" | "dialog";
  onClose?: () => void;
};

function RadiusInlineSelect<T extends number>({
  label,
  labelClassName,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: ReactNode;
  labelClassName?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={wrapRef}
      className={
        compact
          ? "relative flex min-w-0 items-center gap-2"
          : "relative flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
      }
    >
      <span
        className={
          compact
            ? `shrink-0 text-[13px] font-medium leading-tight text-[#3E6897] ${labelClassName ?? ""}`
            : `shrink-0 text-[11px] font-semibold leading-tight text-blueNavy sm:w-[128px] sm:text-xs ${labelClassName ?? ""}`
        }
      >
        {label}
      </span>
      <div className={compact ? "relative min-w-[96px]" : "relative min-w-0 flex-1"}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            compact
              ? "inline-flex h-[45px] w-[92px] items-center justify-between gap-2 rounded-[6px] border border-[#DEECFF] bg-[#F3F8FF] px-3 text-left text-[13px] font-semibold text-[#052850] shadow-sm transition-colors hover:border-blue"
              : "inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-blueExtraLight bg-white px-3 py-2 text-left text-xs font-medium text-blueNavy shadow-sm transition-colors hover:border-blue"
          }
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className={compact ? "text-[13px] font-semibold text-[#052850]" : ""}>{value} км</span>
          <svg
            width="10"
            height="6"
            viewBox="0 0 10 6"
            fill="none"
            className={`shrink-0 text-blueSteel transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path
              d="m1 1 4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open ? (
          <ul
            className="absolute start-0 top-[calc(100%+4px)] z-20 max-h-[200px] w-full overflow-auto rounded-xl border border-blueExtraLight bg-white py-1 shadow-lg"
            role="listbox"
          >
            {options.map((km) => (
              <li key={km} role="option" aria-selected={km === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(km);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs font-medium hover:bg-blueUltraLight ${
                    km === value ? "bg-blueUltraLight text-blue" : "text-blueNavy"
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

export function ChooseLocationView({ variant = "page", onClose }: Props) {
  const router = useRouter();
  const isDialog = variant === "dialog";

  const [session, setSession] = useState<Session | null>(null);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [geoCenter, setGeoCenter] = useState<[number, number] | null>(null);
  const [mapTick, setMapTick] = useState(0);

  const [searchRadiusKm, setSearchRadiusKmState] = useState<SearchRadiusKm>(5);
  const [nearRadiusKm, setNearRadiusKmState] = useState<NearRadiusKm>(2);

  const [cityQuery, setCityQuery] = useState("");
  const [cityQueryFocused, setCityQueryFocused] = useState(false);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [pickedFromMap, setPickedFromMap] = useState(false);
  const cityInputRef = useRef<HTMLInputElement | null>(null);

  const normalizeNearbyLabel = useCallback((nameRaw: string, source: "search" | "map"): string => {
    const cleaned = nameRaw
      .replace(/^г\.\s*/i, "")
      .replace(/^город\s+/i, "")
      .replace(/^пос[её]лок\s+/i, "")
      .replace(/^пгт\s+/i, "")
      .replace(/^село\s+/i, "")
      .trim();
    if (!cleaned) return "";
    if (source === "search") return `г. ${cleaned}`;
    const low = nameRaw.toLowerCase();
    if (low.includes("пос") || low.includes("пгт")) return `п. ${cleaned}`;
    if (low.includes("село")) return `с. ${cleaned}`;
    return `г. ${cleaned}`;
  }, []);

  useEffect(() => {
    setSearchRadiusKmState(getSearchRadiusKm());
    setNearRadiusKmState(getNearRadiusKm());
  }, []);

  useEffect(() => {
    let settled = false;
    const finish = (center: [number, number], initialPick: { lat: number; lng: number } | null) => {
      if (settled) return;
      settled = true;
      setSession({ center, initialPick });
      setPicked(initialPick);
    };

    const saved = getUserLocation();
    if (saved) {
      const fallbackName = saved.nearbyLabel
        ? saved.nearbyLabel.replace(/^г\.\s*/i, "").replace(/^п\.\s*/i, "").replace(/^с\.\s*/i, "").trim()
        : "";
      finish([saved.lat, saved.lng], { lat: saved.lat, lng: saved.lng });
      setCityQuery(saved.queryText?.trim() || fallbackName);
      setPickedFromMap(saved.source === "map");
      return () => {
        settled = true;
      };
    }

    const finishDefaultOrSaved = () => {
      finish(DEFAULT_CENTER, null);
    };

    const timer = window.setTimeout(() => {
      finishDefaultOrSaved();
    }, 3200);

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.clearTimeout(timer);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (validGeo(lat, lng)) {
            finish([lat, lng], { lat, lng });
          } else {
            finishDefaultOrSaved();
          }
        },
        () => {
          window.clearTimeout(timer);
          finishDefaultOrSaved();
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 2800 },
      );
    } else {
      window.clearTimeout(timer);
      finishDefaultOrSaved();
    }

    return () => {
      settled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const handlePick = useCallback((lat: number, lng: number) => {
    setPicked({ lat, lng });
    setPickedFromMap(true);
    setGeocodeError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as { name?: string | null };
        if (res.ok && typeof data.name === "string" && data.name.trim()) {
          setCityQuery(data.name.trim());
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const onSearchRadius = useCallback((km: SearchRadiusKm) => {
    setSearchRadiusKm(km);
    setSearchRadiusKmState(km);
  }, []);

  const onNearRadius = useCallback((km: NearRadiusKm) => {
    setNearRadiusKm(km);
    setNearRadiusKmState(km);
  }, []);

  const save = useCallback(() => {
    const doSave = async () => {
      if (!picked) return;
      let nearbyLabel = "";
      const queryText = cityQuery.trim();

      if (pickedFromMap) {
        try {
          const res = await fetch(
            `/api/geocode/reverse?lat=${encodeURIComponent(String(picked.lat))}&lng=${encodeURIComponent(String(picked.lng))}`,
            { cache: "no-store" },
          );
          const data = (await res.json()) as { name?: string | null };
          if (res.ok && typeof data.name === "string" && data.name.trim()) {
            nearbyLabel = normalizeNearbyLabel(data.name, "map");
          }
        } catch {
          /* ignore */
        }
      } else if (queryText) {
        nearbyLabel = normalizeNearbyLabel(queryText, "search");
      }

      setUserLocation(picked.lat, picked.lng, {
        source: pickedFromMap ? "map" : "manual",
        queryText,
        nearbyLabel: nearbyLabel || undefined,
      });
      if (isDialog) {
        onClose?.();
      } else {
        router.push("/");
      }
    };
    void doSave();
  }, [picked, cityQuery, pickedFromMap, normalizeNearbyLabel, isDialog, onClose, router]);

  const runGeocode = useCallback(async () => {
    const q = cityQuery.trim();
    if (!q) {
      setGeocodeError("Введите название города");
      return;
    }
    setGeocodeError(null);
    setGeocodeLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { lat: number | null; lng: number | null; name?: string | null };
      if (!res.ok || data.lat == null || data.lng == null || !validGeo(data.lat, data.lng)) {
        setGeocodeError("Город не найден — попробуйте другое название");
        return;
      }
      setPicked({ lat: data.lat, lng: data.lng });
      setPickedFromMap(false);
      if (typeof data.name === "string" && data.name.trim()) {
        setCityQuery(data.name.trim());
      }
      setGeoCenter([data.lat, data.lng]);
      setMapTick((t) => t + 1);
    } catch {
      setGeocodeError("Не удалось выполнить поиск");
    } finally {
      setGeocodeLoading(false);
    }
  }, [cityQuery]);

  if (!session) {
    return (
      <div
        className={`flex flex-col items-center justify-center ${isDialog ? "min-h-[200px]" : "min-h-[50dvh]"} w-full px-4 py-10`}
      >
        <p className="text-sm font-medium text-blueSteel">Определяем местоположение…</p>
      </div>
    );
  }

  const mapCenter: [number, number] = geoCenter ?? session.center;
  const initialPickForMap = picked ?? session.initialPick;
  const showCityQueryChip = cityQuery.trim().length > 0 && !cityQueryFocused;

  const titleBlock = isDialog ? (
    <>
      <header className="pe-8 md:pe-10">
        <h1 id="choose-location-title" className="text-[22px] font-extrabold leading-tight text-blueNavy">
          Укажите ваше положение
        </h1>
        <p className="mt-3 text-[13px] font-medium leading-snug text-blueSteel">
          Задайте радиус и тогда мы сможем показать вам товары, магазины и расстояние до них
        </p>
      </header>
      <div className="mt-5 h-px w-full bg-[#B7C5D5]" />
    </>
  ) : (
    <>
      <p className="mb-4">
        <Link href="/" prefetch={false} className="text-sm font-semibold text-blue hover:text-blueDark">
          ← На главную
        </Link>
      </p>
      <h1 className="text-xl font-extrabold text-blueNavy md:text-2xl">Мое местоположение на карте</h1>
      <p className="mt-2 text-sm text-blueSteel">
        Нажмите по карте, чтобы указать местоположение. Затем нажмите «Сохранить» — координаты запомнятся в этом
        браузере.
      </p>
    </>
  );

  const locationSection = isDialog ? (
    <section className="mb-5 mt-5">
      <h2 className="mb-3 text-[14px] font-semibold text-[#052850]">Ваше местоположение</h2>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative w-[524px] max-w-full">
            <Image
              src="/icon/search.svg"
              alt=""
              width={20}
              height={20}
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-80"
            />
            <input
              ref={cityInputRef}
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onFocus={() => setCityQueryFocused(true)}
              onBlur={() => setCityQueryFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runGeocode();
                }
              }}
              placeholder="Город, улица, адрес"
              className={`h-[45px] w-full rounded-[6px] border border-[#DEECFF] bg-[#F3F8FF] py-2.5 text-[13px] font-semibold text-[#052850] shadow-sm outline-none transition-colors placeholder:text-blueSteel focus:border-blue ${
                showCityQueryChip ? "pr-[146px] pl-[4px]" : "pl-10 pr-[146px]"
              }`}
              aria-label="Поиск города"
            />
            {showCityQueryChip ? (
              <div className="pointer-events-none absolute inset-y-0 left-0 right-[86px] flex items-center">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setCityQueryFocused(true);
                    requestAnimationFrame(() => {
                      cityInputRef.current?.focus();
                      const len = cityInputRef.current?.value.length ?? 0;
                      cityInputRef.current?.setSelectionRange(len, len);
                    });
                  }}
                  className="pointer-events-auto my-[4px] ml-[4px] inline-flex h-[34px] max-w-full items-center gap-2 rounded-md bg-[#DEECFF] px-[15px] text-[15px] font-medium text-blueNavy md:h-[46px]"
                  aria-label="Изменить запрос"
                >
                  <span className="truncate">{cityQuery}</span>
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue text-white transition-colors hover:bg-[#0057BE]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCityQuery("");
                      setGeocodeError(null);
                    }}
                    aria-label="Очистить запрос"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setCityQuery("");
                        setGeocodeError(null);
                      }
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                      <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              disabled={geocodeLoading}
              onClick={() => void runGeocode()}
              className="absolute bottom-[2px] right-[2px] top-[2px] inline-flex items-center justify-center rounded-lg bg-blue px-4 text-sm font-medium text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {geocodeLoading ? "Поиск..." : "Найти"}
            </button>
          </div>
          <RadiusInlineSelect
            compact
            label={
              <span className="inline-flex items-center gap-2">
                <Image src="/icon/rad.svg" alt="" width={15} height={15} className="h-[15px] w-[15px]" />
                Радиус поиска
              </span>
            }
            value={searchRadiusKm}
            options={SEARCH_RADIUS_KM_OPTIONS}
            onChange={onSearchRadius}
          />
          <RadiusInlineSelect
            compact
            label={
              <span className="inline-flex items-center gap-2">
                <Image src="/icon/rad-yellow.svg" alt="" width={15} height={15} className="h-[15px] w-[15px]" />
                Рядом с вами
              </span>
            }
            value={nearRadiusKm}
            options={NEAR_RADIUS_KM_OPTIONS}
            onChange={onNearRadius}
          />
        </div>
        {geocodeError ? <p className="text-xs font-medium text-red-600">{geocodeError}</p> : null}

      </div>
    </section>
  ) : null;

  const mapSectionTitle = isDialog ? (
    <h2 className="mb-4 text-[14px] font-semibold text-[#052850]">Или укажите на карте</h2>
  ) : null;

  const mapBlock = (
    <div
      className={`relative w-full min-h-[280px] ${
        isDialog
          ? "mx-auto h-[393px] max-w-[1025px] overflow-hidden rounded-xl border border-blueExtraLight"
          : "mt-6 h-[min(55dvh,480px)]"
      }`}
    >
      <YandexMap
        key={mapTick}
        stores={[]}
        pickMode
        mapCenter={mapCenter}
        mapZoom={isDialog ? 12 : 14}
        initialPick={initialPickForMap}
        onPick={handlePick}
        pickDisplayRadiusKm={searchRadiusKm}
        fill
        minimalControls={isDialog}
      />
    </div>
  );

  const footer = isDialog ? (
    <div className="mt-[40px] flex justify-end">
      <button
        type="button"
        disabled={!picked}
        onClick={save}
        className="inline-flex h-[45px] w-[189px] items-center justify-center rounded-xl bg-blue text-[13px] font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Готово
      </button>
    </div>
  ) : (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-blueSteel">
        {picked
          ? `Выбрано: ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}`
          : "Кликните по карте, чтобы указать местоположение."}
      </p>
      <button
        type="button"
        disabled={!picked}
        onClick={save}
        className="inline-flex items-center justify-center rounded-xl border border-blue bg-blue px-6 py-3 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Сохранить
      </button>
    </div>
  );

  return (
    <div
      className={
        isDialog
          ? "mx-auto w-full max-w-[1025px]"
          : "mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8"
      }
    >
      {titleBlock}
      {locationSection}
      {mapSectionTitle}
      {mapBlock}
      {footer}
    </div>
  );
}
