"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type YandexMapStorePoint = {
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  /** legacy: больше не используется для метки магазина */
  logoUrl?: string | null;
};

const DEFAULT_CENTER: [number, number] = [44.61665, 33.52536];
const DEFAULT_ZOOM = 10;

function zoomForFixedCircleScreenSize(radiusKm: number, lat: number): number {
  const rMeters = Math.max(1, radiusKm * 1000);
  const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  const cosLat = Math.max(0.1, Math.cos(latRad));
  const targetRadiusPx = 250;
  const metersPerPixelNeeded = rMeters / targetRadiusPx;
  const zoom = Math.log2((156543.03392 * cosLat) / metersPerPixelNeeded);
  return Math.max(6, Math.min(15, zoom));
}

type YmapsMapInstance = { destroy: () => void };

type YmapsMapWithBounds = YmapsMapInstance & {
  geoObjects: {
    add: (o: unknown) => void;
    remove: (o: unknown) => void;
    getBounds: () => number[][] | null;
  };
  setBounds: (
    bounds: number[][],
    opts?: { checkZoomRange?: boolean; zoomMargin?: number },
  ) => void;
  setCenter: (center: number[], zoom?: number) => void;
};

type YmapsPlacemarkOptions = {
  preset?: string;
  iconLayout?: unknown;
  iconImageHref?: string;
  iconImageSize?: number[];
  iconImageOffset?: number[];
  iconOffset?: number[];
  iconShape?: { type: string; coordinates: number[]; radius: number };
  hasHint?: boolean;
  hintLayout?: unknown;
  hasBalloon?: boolean;
  balloonLayout?: unknown;
  balloonPanelMaxMapArea?: number;
};

type YmapsMapState = {
  center: number[];
  zoom: number;
  /** Пустой массив — без кнопок «Слои», «Пробки», поиска, зума и т.д. */
  controls?: unknown[];
};

type YmapsApi = {
  Map: new (el: HTMLElement, state: YmapsMapState) => YmapsMapWithBounds;
  templateLayoutFactory: {
    createClass: (
      template: string,
      methods?: Record<string, unknown>,
    ) => new (...args: never[]) => unknown;
  };
  Placemark: new (
    coords: number[],
    props: Record<string, string | undefined>,
    options?: YmapsPlacemarkOptions,
  ) => unknown;
  /** [ [lat, lng], radiusMeters ] */
  Circle: new (
    geometry: [[number, number], number],
    properties?: Record<string, unknown>,
    options?: {
      fillColor?: string;
      strokeColor?: string;
      strokeWidth?: number;
      strokeOpacity?: number;
      /** Пропускать клики на карту (иначе круг перехватывает выбор точки в pickMode и клики по схеме). */
      interactivityModel?: string;
    },
  ) => unknown;
  Clusterer: new (
    options?: {
      clusterIconLayout?: unknown;
      clusterIconOffset?: number[];
      clusterIconShape?: { type: string; coordinates: number[]; radius: number };
      groupByCoordinates?: boolean;
      hasBalloon?: boolean;
      hasHint?: boolean;
    },
  ) => {
    add: (items: unknown[]) => void;
    events: { add: (eventName: string, handler: (event: { get: (key: string) => unknown }) => void) => void };
  };
};

/** Круг только для отображения: клики идут на карту (выбор точки, зум и т.д.). */
const CIRCLE_PASS_THROUGH_INTERACTIVITY = { interactivityModel: "default#silent" } as const;

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeLogoUrl(url?: string | null): string | null {
  if (!url) return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith("/") || t.startsWith("http://") || t.startsWith("https://")) return t;
  return null;
}

/** Одна загрузка скрипта на вкладку: общий промис или уже готовый `window.ymaps`. */
let ymapsScriptPromise: Promise<void> | null = null;

function loadYmaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const w = window as Window & { ymaps?: { ready: (fn: () => void) => void } };
  if (w.ymaps) {
    return new Promise((resolve) => {
      w.ymaps!.ready(() => resolve());
    });
  }

  if (!ymapsScriptPromise) {
    ymapsScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const key = encodeURIComponent(apiKey);
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${key}&lang=ru_RU`;
      script.async = true;
      script.onload = () => {
        const y = (window as Window & { ymaps?: { ready: (fn: () => void) => void } }).ymaps;
        if (!y) {
          ymapsScriptPromise = null;
          reject(new Error("ymaps missing"));
          return;
        }
        y.ready(() => resolve());
      };
      script.onerror = () => {
        ymapsScriptPromise = null;
        reject(new Error("script error"));
      };
      document.head.appendChild(script);
    });
  }

  return ymapsScriptPromise;
}

/** Иконка магазина на карте: `public/icon/tovar_v_magazine.svg` */
const STORE_MARKER_W = 37;
const STORE_MARKER_H = 61;
/** Якорь — центр нижней синей точки (см. viewBox SVG) */
const STORE_ANCHOR_X = 18.5;
const STORE_ANCHOR_Y = 49.5;

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
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

const mapShellClassDefault =
  "flex h-[min(70dvh,560px)] w-full min-h-[320px] items-center justify-center overflow-hidden rounded-xl border border-blueExtraLight bg-blueUltraLight/40 px-4";

const mapShellClassFill =
  "absolute inset-0 flex items-center justify-center overflow-hidden bg-blueUltraLight/40 px-4";

const mapContainerClassDefault =
  "h-[min(70dvh,560px)] w-full min-h-[320px] overflow-hidden rounded-xl border border-blueExtraLight bg-blueUltraLight/40";

const mapContainerClassFill =
  "absolute inset-0 overflow-hidden border-t border-blueExtraLight bg-blueUltraLight/40";

const mapContainerClassFillAside =
  "absolute inset-0 overflow-hidden bg-[#E8EAEE]";

const mapShellClassFillAside =
  "absolute inset-0 flex items-center justify-center overflow-hidden bg-[#E8EAEE] px-4";

type PickPlacemark = {
  geometry: { setCoordinates: (c: number[]) => void };
};

type PickRadiusCircle = {
  geometry: {
    setCoordinates: (c: number[]) => void;
    setRadius: (r: number) => void;
  };
};

export function YandexMap({
  stores = [],
  fill = false,
  embedAside = false,
  /** Режим выбора точки: клик по карте ставит/двигает метку, вызывает `onPick`. */
  pickMode = false,
  mapCenter,
  mapZoom,
  initialPick = null,
  onPick,
  /** В режиме pickMode: радиус круга вокруг метки (км), 0 — без круга. */
  pickDisplayRadiusKm = 0,
  /** Позиция пользователя (иконка i_map.svg), не в режиме pickMode. */
  userLocation,
  /** Радиус вокруг точки пользователя (км); круг только при заданной `userLocation`. */
  searchRadiusKm = 0,
  /** Без встроенных контролов API (слои, пробки, поиск, зум и геолокация). */
  hideMapControls = false,
  /** Минимальные контролы: только зум и нижние подписи. */
  minimalControls = false,
  /** true — маркер магазина как `tovar_v_magazine.svg` (для страницы товара). */
  useProductStoreMarker = false,
  highlightedStoreSlugs = [],
}: {
  stores?: YandexMapStorePoint[];
  fill?: boolean;
  embedAside?: boolean;
  pickMode?: boolean;
  mapCenter?: [number, number];
  mapZoom?: number;
  initialPick?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  pickDisplayRadiusKm?: number;
  userLocation?: { lat: number; lng: number };
  searchRadiusKm?: number;
  hideMapControls?: boolean;
  minimalControls?: boolean;
  useProductStoreMarker?: boolean;
  highlightedStoreSlugs?: string[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim();

  const validStores = useMemo(
    () => stores.filter((s) => isValidLatLng(s.latitude, s.longitude)),
    [stores],
  );
  const highlightedStoreSlugSet = useMemo(() => new Set(highlightedStoreSlugs), [highlightedStoreSlugs]);

  const mapCenterKey =
    mapCenter && isValidLatLng(mapCenter[0], mapCenter[1])
      ? `${mapCenter[0]},${mapCenter[1]}`
      : "def";
  const initialPickKey =
    initialPick && isValidLatLng(initialPick.lat, initialPick.lng)
      ? `${initialPick.lat},${initialPick.lng}`
      : "none";
  const storesKey = useMemo(
    () =>
      pickMode
        ? "pick"
        : validStores
            .map((s) => `${s.slug}:${s.latitude}:${s.longitude}:${s.logoUrl ?? ""}:${highlightedStoreSlugSet.has(s.slug) ? "y" : "n"}`)
            .join("|"),
    [highlightedStoreSlugSet, pickMode, validStores],
  );

  const userLocationKey =
    !pickMode && userLocation && isValidLatLng(userLocation.lat, userLocation.lng)
      ? `${userLocation.lat},${userLocation.lng}`
      : "none";

  const searchRadiusKey =
    !pickMode && searchRadiusKm > 0 && userLocationKey !== "none"
      ? String(Math.max(0, Math.floor(searchRadiusKm)))
      : "0";

  const mapZoomResolved = mapZoom ?? 12;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YmapsMapInstance | null>(null);
  const lastPickCoordsRef = useRef<[number, number] | null>(null);
  const pickCircleRef = useRef<PickRadiusCircle | null>(null);
  const pickRadiusKmRef = useRef(pickDisplayRadiusKm);
  pickRadiusKmRef.current = pickDisplayRadiusKm;
  const [loadError, setLoadError] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!apiKey) return;

    const el = containerRef.current;
    if (!el) return;

    setLoadError(false);
    let cancelled = false;

    loadYmaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return;

        const ymaps = (window as unknown as Window & { ymaps: YmapsApi }).ymaps;

        mapRef.current?.destroy();
        mapRef.current = null;

        let center: number[];
        let zoom: number;

        const userLoc =
          !pickMode && userLocation && isValidLatLng(userLocation.lat, userLocation.lng)
            ? userLocation
            : null;

        if (pickMode) {
          center = mapCenter && isValidLatLng(mapCenter[0], mapCenter[1])
            ? [mapCenter[0], mapCenter[1]]
            : [...DEFAULT_CENTER];
          zoom = mapZoomResolved;
        } else if (validStores.length === 1) {
          const s0 = validStores[0];
          if (userLoc) {
            center = [(s0.latitude + userLoc.lat) / 2, (s0.longitude + userLoc.lng) / 2];
            zoom = 14;
          } else {
            center = [s0.latitude, s0.longitude];
            zoom = 14;
          }
        } else {
          center = [...DEFAULT_CENTER];
          zoom = DEFAULT_ZOOM;
        }

        const map = new ymaps.Map(containerRef.current, {
          center: [...center],
          zoom,
          ...(hideMapControls ? { controls: [] } : minimalControls ? { controls: ["zoomControl"] } : {}),
        });

        mapRef.current = map;

        if (pickMode) {
          let pickPl: PickPlacemark | null = null;
          lastPickCoordsRef.current = null;
          pickCircleRef.current = null;

          const syncPickCircle = (coords: number[], mapInst: YmapsMapWithBounds) => {
            lastPickCoordsRef.current = [coords[0], coords[1]];
            const rKm = Math.max(0, pickRadiusKmRef.current ?? 0);
            const rM = rKm * 1000;
            if (rM > 0) {
              if (!pickCircleRef.current) {
                pickCircleRef.current = new ymaps.Circle(
                  [[coords[0], coords[1]], rM],
                  {},
                  {
                    ...CIRCLE_PASS_THROUGH_INTERACTIVITY,
                    fillColor: "rgba(0, 117, 255, 0.12)",
                    strokeColor: "#0075FF",
                    strokeOpacity: 0.9,
                    strokeWidth: 2,
                  },
                ) as PickRadiusCircle;
                mapInst.geoObjects.add(pickCircleRef.current as unknown);
              } else {
                pickCircleRef.current.geometry.setCoordinates(coords);
                pickCircleRef.current.geometry.setRadius(rM);
              }
            } else if (pickCircleRef.current) {
              mapInst.geoObjects.remove(pickCircleRef.current as unknown);
              pickCircleRef.current = null;
            }
          };

          const movePick = (coords: number[]) => {
            if (!pickPl) {
              pickPl = new ymaps.Placemark(
                coords,
                {},
                {
                  iconLayout: "default#image",
                  iconImageHref: "/icon/i_map.svg",
                  iconImageSize: [37, 51],
                  iconImageOffset: [-18, -50],
                },
              ) as PickPlacemark;
              map.geoObjects.add(pickPl as unknown);
            } else {
              pickPl.geometry.setCoordinates(coords);
            }
            syncPickCircle(coords, map);
            onPickRef.current?.(coords[0], coords[1]);
          };

          if (initialPick && isValidLatLng(initialPick.lat, initialPick.lng)) {
            movePick([initialPick.lat, initialPick.lng]);
          }

          const m = map as unknown as {
            events: {
              add: (ev: string, fn: (e: { get: (k: string) => number[] }) => void) => void;
            };
          };
          m.events.add("click", (e) => {
            const c = e.get("coords");
            movePick(c);
          });
        } else {
          const productStoreMarkerLayout = ymaps.templateLayoutFactory.createClass(
            `<div style="width:${STORE_MARKER_W}px;height:${STORE_MARKER_H}px;line-height:0">` +
              `<img src="/icon/tovar_v_magazine.svg" width="${STORE_MARKER_W}" height="${STORE_MARKER_H}" alt="" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;pointer-events:none" />` +
              `</div>`,
          );
          const dotStoreMarkerLayoutWhite = ymaps.templateLayoutFactory.createClass(
            `<div style="width:23px;height:23px;border-radius:50%;background:#FFFFFF;border:4px solid #0075FF;box-sizing:border-box"></div>`,
          );
          const dotStoreMarkerLayoutYellow = ymaps.templateLayoutFactory.createClass(
            `<div style="width:23px;height:23px;border-radius:50%;background:#FFD640;border:4px solid #0075FF;box-sizing:border-box"></div>`,
          );
          const clusterMarkerLayout = ymaps.templateLayoutFactory.createClass(
            `<div class="map-cluster-marker" style="width:38px;height:38px;border-radius:50%;background:#FFFFFF;border:4px solid #0075FF;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#0075FF;font-weight:700;font-size:13px;line-height:1">{{ properties.geoObjects.length }}</div>`,
            {
              build: function build(this: {
                getData: () => { properties?: { get?: (name: string) => unknown } };
                getParentElement: () => HTMLElement | null;
                constructor: { superclass?: { build?: (thisArg: unknown, ctx?: unknown) => void } };
              }) {
                this.constructor.superclass?.build?.call(this, undefined);
                const geoObjectsRaw = this.getData()?.properties?.get?.("geoObjects");
                const geoObjects = Array.isArray(geoObjectsRaw)
                  ? (geoObjectsRaw as Array<{ properties?: { get?: (name: string) => unknown } }>)
                  : [];
                const hasHighlighted = geoObjects.some((geoObject) =>
                  Boolean(geoObject.properties?.get?.("hasHighlighted")),
                );
                const node = this.getParentElement()?.querySelector(".map-cluster-marker") as HTMLElement | null;
                if (node) node.style.background = hasHighlighted ? "#FFD640" : "#FFFFFF";
              },
            },
          );
          const storeHintLayout = ymaps.templateLayoutFactory.createClass(
            `<div style="display:flex;align-items:center;gap:7px;min-height:41px;max-width:min(calc(100vw - 30px),420px);padding:6px 10px;background:rgba(255,255,255,.9);border-radius:6px;box-shadow:0 15px 35px rgba(52,88,130,.35);backdrop-filter:blur(4px)">` +
              `<div style="display:flex;height:25px;max-width:110px;align-items:center;justify-content:center;overflow:hidden;border-radius:6px;background:#fff;flex-shrink:0">` +
                `<img src="{{ properties.logoUrl }}" alt="" draggable="false" style="height:25px;width:auto;max-width:100%;object-fit:contain;pointer-events:none" />` +
              `</div>` +
              `<span style="min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;word-break:break-word;color:#3E6897;font-size:11px;font-weight:500;line-height:1.2">` +
                `{{ properties.storeName }}` +
              `</span>` +
            `</div>`,
          );
          const storeBalloonLayout = ymaps.templateLayoutFactory.createClass(
            `<div style="width:min(280px,calc(100vw - 28px));padding:12px;border-radius:12px;background:#fff;box-shadow:0 15px 35px rgba(52,88,130,.22);border:1px solid #DEECFF">` +
              `<div style="display:flex;align-items:center;gap:8px">` +
                `<div style="display:flex;height:28px;max-width:120px;align-items:center;justify-content:center;overflow:hidden;border-radius:6px;background:#fff;flex-shrink:0">` +
                  `<img src="{{ properties.logoUrl }}" alt="" draggable="false" style="height:20px;width:auto;max-width:100%;object-fit:contain;pointer-events:none" />` +
                `</div>` +
                `<div style="min-width:0;color:#052551;font-size:13px;font-weight:700;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">` +
                  `{{ properties.storeName }}` +
                `</div>` +
              `</div>` +
              `<a href="{{ properties.storeProductsHref }}" style="margin-top:10px;display:inline-flex;height:36px;align-items:center;justify-content:center;padding:0 12px;border-radius:8px;background:#0075FF;color:#fff;text-decoration:none;font-size:13px;font-weight:700;line-height:1;white-space:nowrap">` +
                `Товары магазина` +
              `</a>` +
            `</div>`,
          );
          const storeIconOptions: YmapsPlacemarkOptions = useProductStoreMarker
            ? {
                iconOffset: [-Math.round(STORE_ANCHOR_X), -Math.round(STORE_ANCHOR_Y)],
                iconShape: {
                  type: "Circle",
                  coordinates: [0, -20],
                  radius: 20,
                },
                iconLayout: productStoreMarkerLayout,
              }
            : {
                iconOffset: [-12, -12],
                iconShape: {
                  type: "Circle",
                  coordinates: [0, 0],
                  radius: 12,
                },
                iconLayout: dotStoreMarkerLayoutWhite,
              };

          const userMarkerLayout = ymaps.templateLayoutFactory.createClass(
            `<div style="width:37px;height:51px;display:block">` +
              `<svg width="37" height="51" viewBox="0 0 37 51" fill="none" xmlns="http://www.w3.org/2000/svg">` +
              `<path d="M36.425 18.1591C36.425 8.10038 28.3008 0 18.2125 0C8.1242 0 0 8.10038 0 18.1591C0 28.2178 18.2125 47 18.2125 47C18.2125 47 36.425 28.2178 36.425 18.1591ZM9.73119 17.803C9.73119 13.1742 13.5701 9.34659 18.2125 9.34659C22.8549 9.34659 26.6938 13.0852 26.6938 17.803C26.6938 22.4318 22.9442 26.2595 18.2125 26.2595C13.5701 26.2595 9.73119 22.4318 9.73119 17.803Z" fill="#FD0A5A"/>` +
              `<path d="M18.2109 1.5C27.3515 1.5 34.7109 8.85948 34.7109 18C34.7109 20.2263 33.6984 23.0003 32.1143 25.9551C30.538 28.8952 28.4302 31.9529 26.3135 34.7285C24.1982 37.5022 22.0814 39.9841 20.4932 41.7734C19.6993 42.6679 19.0377 43.3891 18.5752 43.8857C18.4353 44.036 18.3126 44.1647 18.2109 44.2725C18.1093 44.1647 17.9866 44.036 17.8467 43.8857C17.3842 43.3891 16.7226 42.6679 15.9287 41.7734C14.3405 39.9841 12.2236 37.5022 10.1084 34.7285C7.99168 31.9529 5.8839 28.8952 4.30762 25.9551C2.72346 23.0003 1.71094 20.2263 1.71094 18C1.71094 8.85948 9.07041 1.5 18.2109 1.5ZM18.2109 9.25C13.6015 9.25 9.79395 13.0575 9.79395 17.667C9.79412 22.2763 13.6016 26.083 18.2109 26.083C22.9071 26.083 26.6278 22.2729 26.6279 17.667C26.6279 12.9708 22.817 9.25 18.2109 9.25Z" fill="#FD0A5A" stroke="white"/>` +
              `<circle cx="18.2141" cy="17.6242" r="9.9875" fill="#FD0A5A"/>` +
              `<path d="M19.9789 25V20.314L21.1889 21.348H17.6469C16.2243 21.348 14.9923 21.1207 13.9509 20.666C12.9243 20.1967 12.1323 19.5293 11.5749 18.664C11.0176 17.7987 10.7389 16.7647 10.7389 15.562C10.7389 14.33 11.0249 13.274 11.5969 12.394C12.1836 11.4993 13.0123 10.81 14.0829 10.326C15.1536 9.842 16.4149 9.6 17.8669 9.6H25.0829V25H19.9789ZM10.8049 25L14.6769 19.39H19.8469L16.2389 25H10.8049ZM19.9789 18.686V12.35L21.1889 13.604H17.9549C17.2949 13.604 16.7963 13.758 16.4589 14.066C16.1363 14.374 15.9749 14.8433 15.9749 15.474C15.9749 16.1193 16.1436 16.6107 16.4809 16.948C16.8183 17.2707 17.3096 17.432 17.9549 17.432H21.1889L19.9789 18.686Z" fill="white"/>` +
              `<ellipse cx="18.2109" cy="49.5" rx="6" ry="1.5" fill="#FD0A5A"/>` +
              `</svg>` +
              `</div>`,
          );

          const storePlacemarks: unknown[] = [];
          for (const s of validStores) {
            const balloonContent = `<div style="padding:4px 2px;line-height:1.4"><strong>${escHtml(s.name)}</strong><br/><a href="/stores/${encodeURIComponent(s.slug)}">Перейти в магазин</a></div>`;
            const logoSrc = safeLogoUrl(s.logoUrl) ?? "/mlavka/img/logo.svg";
            const isHighlighted = highlightedStoreSlugSet.has(s.slug);
            const placemark = new ymaps.Placemark(
              [s.latitude, s.longitude],
              {
                storeName: s.name,
                storeSlug: s.slug,
                storeProductsHref: `/catalog?store=${encodeURIComponent(s.slug)}`,
                logoUrl: logoSrc,
                hasHighlighted: isHighlighted ? "1" : "",
                balloonContent,
              },
              {
                ...storeIconOptions,
                ...(useProductStoreMarker
                  ? {}
                  : {
                      iconLayout: isHighlighted
                        ? dotStoreMarkerLayoutYellow
                        : dotStoreMarkerLayoutWhite,
                    }),
                hasHint: true,
                hintLayout: storeHintLayout,
                hasBalloon: true,
                balloonLayout: storeBalloonLayout,
                balloonPanelMaxMapArea: 0,
              },
            );
            storePlacemarks.push(placemark);
          }
          if (useProductStoreMarker) {
            for (const p of storePlacemarks) map.geoObjects.add(p);
          } else {
            const clustererHasHint = true;
            const clusterer = new ymaps.Clusterer({
              clusterIconLayout: clusterMarkerLayout,
              clusterIconOffset: [-19, -19],
              clusterIconShape: { type: "Circle", coordinates: [0, 0], radius: 19 },
              groupByCoordinates: false,
              hasBalloon: false,
              hasHint: clustererHasHint,
            });
            clusterer.add(storePlacemarks);
            map.geoObjects.add(clusterer as unknown);
          }

          if (userLoc) {
            const userPlacemark = new ymaps.Placemark(
              [userLoc.lat, userLoc.lng],
              { balloonContent: "Вы здесь" },
              {
                iconLayout: userMarkerLayout,
                iconOffset: [-18, -50],
                iconShape: { type: "Circle", coordinates: [0, -18], radius: 18 },
              },
            );
            map.geoObjects.add(userPlacemark);

            const rKm =
              typeof searchRadiusKm === "number" && Number.isFinite(searchRadiusKm)
                ? Math.max(0, searchRadiusKm)
                : 0;
            if (rKm > 0) {
              const radiusM = rKm * 1000;
              const circle = new ymaps.Circle(
                [[userLoc.lat, userLoc.lng], radiusM],
                {},
                {
                  ...CIRCLE_PASS_THROUGH_INTERACTIVITY,
                  fillColor: "rgba(0, 117, 255, 0.07)",
                  strokeColor: "#0075FF",
                  strokeOpacity: 1,
                  strokeWidth: 2,
                },
              );
              map.geoObjects.add(circle);
            }

            if (rKm > 0) {
              const radiusZoom = zoomForFixedCircleScreenSize(rKm, userLoc.lat);
              map.setCenter([userLoc.lat, userLoc.lng], radiusZoom);
            } else if (validStores.length > 0) {
              const bounds = map.geoObjects.getBounds();
              if (bounds) {
                map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 48 });
              }
            } else {
              map.setCenter([userLoc.lat, userLoc.lng], rKm > 0 ? 12 : 14);
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      pickCircleRef.current = null;
      lastPickCoordsRef.current = null;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // mapCenterKey / initialPickKey / storesKey — стабильные отпечатки, без лишних пересозданий карты.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренно не тянем mapCenter/initialPick/validStores по ссылке
  }, [
    apiKey,
    pickMode,
    mapCenterKey,
    mapZoomResolved,
    initialPickKey,
    storesKey,
    userLocationKey,
    searchRadiusKey,
    hideMapControls,
  ]);

  useEffect(() => {
    if (!pickMode) return;
    const map = mapRef.current as unknown as YmapsMapWithBounds | null;
    const coords = lastPickCoordsRef.current;
    const circ = pickCircleRef.current;
    const rM = Math.max(0, (pickDisplayRadiusKm ?? 0) * 1000);
    if (!map || !coords) return;
    if (rM <= 0) {
      if (circ) {
        map.geoObjects.remove(circ as unknown);
        pickCircleRef.current = null;
      }
      return;
    }
    if (circ) {
      circ.geometry.setCoordinates(coords);
      circ.geometry.setRadius(rM);
    }
  }, [pickDisplayRadiusKm, pickMode]);

  const shellClass = fill
    ? embedAside
      ? mapShellClassFillAside
      : mapShellClassFill
    : mapShellClassDefault;
  const containerClass = fill
    ? embedAside
      ? mapContainerClassFillAside
      : mapContainerClassFill
    : mapContainerClassDefault;

  if (!apiKey) {
    return (
      <div className={shellClass} aria-live="polite">
        <p className="text-center text-sm font-medium text-blueSteel">Не указан API ключ Яндекс.Карт</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={shellClass} aria-live="polite">
        <p className="text-center text-sm font-medium text-red-700">Ошибка загрузки карты</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={containerClass}
      aria-label={pickMode ? "Выбор местоположения на карте" : "Карта магазинов"}
    />
  );
}
