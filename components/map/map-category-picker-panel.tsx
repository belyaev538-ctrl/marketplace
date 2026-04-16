"use client";

import Image from "next/image";
import Link from "next/link";
import { StoreBusinessType } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CatalogProductGrid, type CatalogProductItem } from "@/app/(site)/(with-header)/catalog/catalog-product-grid";
import { CatalogCategoryCardLink } from "@/components/catalog-category-card-link";
import { HomeHeroSearchForm } from "@/components/home-hero-search";
import { MapStoreBusinessTypeTileLink } from "@/components/map/map-store-business-type-tile-link";
import { RouteToStoreLink } from "@/components/route-to-store-link";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCatalogProductCount, normalizeCatalogSort, type CatalogSortValue } from "@/lib/catalog-list-query";
import { getSearchRadiusKm } from "@/lib/search-radius-preference";
import { storeBusinessTypeLabel, type StoreBusinessTypeTileDTO } from "@/lib/store-business-type";
import { getUserLocation } from "@/lib/user-location";

export type MapCategoryPickerCategory = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

type Tab = "products" | "stores";

export type MapStoreCardItem = {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  businessTypes: StoreBusinessType[];
  fulfillmentModes: string[];
  workDescription: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  vkUrl: string | null;
  telegramUrl: string | null;
  whatsappUrl: string | null;
  otherMessengerUrl: string | null;
  productsCount: number;
};

/** Иконка «Магазины» в цвет текста вкладки (currentColor), без белой обводки. */
function MapTabShopIconMuted() {
  return (
    <svg
      width={17}
      height={17}
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path
        d="M13.0996 3.75098C13.2374 3.74473 13.3733 3.78419 13.4863 3.86328C13.5993 3.94242 13.6834 4.05684 13.7246 4.18848L16.0869 11.7881C16.2484 12.3043 16.2855 12.8515 16.1953 13.3848C16.1052 13.9179 15.8904 14.4221 15.5684 14.8564C15.2514 15.2927 14.8342 15.6472 14.3525 15.8896C13.8709 16.132 13.338 16.2563 12.7988 16.251H3.42383C2.90256 16.2508 2.38817 16.1314 1.91992 15.9023C1.45144 15.6731 1.04083 15.3395 0.720703 14.9277C0.400722 14.5161 0.17893 14.0367 0.0722656 13.5264C-0.0344005 13.0158 -0.0230197 12.4869 0.105469 11.9814L2.00586 4.22559C2.0401 4.08697 2.12069 3.96433 2.23438 3.87793C2.34808 3.79153 2.48811 3.74682 2.63086 3.75098H13.0996ZM1.29297 12.2822C1.21261 12.6034 1.20641 12.9387 1.27441 13.2627C1.34246 13.5867 1.48276 13.8916 1.68555 14.1533C1.88835 14.415 2.14854 14.6266 2.44531 14.7734C2.74212 14.9203 3.06828 14.9986 3.39941 15.001H12.7744C13.1145 15.0015 13.4498 14.9209 13.7529 14.7666C14.0559 14.6124 14.3179 14.3885 14.5176 14.1133C14.723 13.8364 14.8604 13.5147 14.918 13.1748C14.9755 12.835 14.9524 12.4862 14.8496 12.1572L12.6494 5.00098H3.09961L1.29297 12.2822Z"
        fill="currentColor"
      />
      <path
        d="M8.10156 0C8.93036 0 9.72547 0.328988 10.3115 0.915039C10.8976 1.50109 11.2266 2.2962 11.2266 3.125V8.125C11.2266 8.29076 11.1612 8.45017 11.0439 8.56738C10.9267 8.68459 10.7673 8.75 10.6016 8.75C10.4358 8.75 10.2764 8.68459 10.1592 8.56738C10.042 8.45017 9.97656 8.29076 9.97656 8.125V3.125C9.97656 2.62772 9.77937 2.15046 9.42773 1.79883C9.0761 1.4472 8.59884 1.25 8.10156 1.25C7.60428 1.25 7.12702 1.4472 6.77539 1.79883C6.42376 2.15046 6.22656 2.62772 6.22656 3.125V8.125C6.22656 8.29076 6.16116 8.45017 6.04395 8.56738C5.92674 8.68459 5.76732 8.75 5.60156 8.75C5.4358 8.75 5.27639 8.68459 5.15918 8.56738C5.04197 8.45017 4.97656 8.29076 4.97656 8.125V3.125C4.97656 2.2962 5.30555 1.50109 5.8916 0.915039C6.47765 0.328988 7.27276 0 8.10156 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

type Props = {
  categories: MapCategoryPickerCategory[];
  storeBusinessTypeTiles: StoreBusinessTypeTileDTO[];
  storeCards: MapStoreCardItem[];
  /** Подсказка при пустом списке категорий (например сузили радиус на карте). */
  productsEmptyMessage?: string;
  /** Подсказка при пустом списке типов магазинов в радиусе. */
  storeTypesEmptyMessage?: string;
  /** Начальная вкладка (из `?tab=stores` на `/map/categories`). */
  initialTab?: Tab;
  /** true: на вкладке «Товары» показываются подкатегории выбранного корня. */
  productsAreSubcategories?: boolean;
  /** Название выбранной родительской категории для заголовка подкатегорий. */
  parentCategoryName?: string | null;
  parentCategorySlug?: string | null;
  parentCategoryId?: string | null;
  selectedSubcategory?: { id: string; name: string; slug: string } | null;
  initialSubcategoryProducts?: { items: CatalogProductItem[]; hasMore: boolean; total: number } | null;
  initialSearchProducts?: { items: CatalogProductItem[]; hasMore: boolean; total: number } | null;
  searchQuery?: string | null;
  productsBackHref?: string;
  onVisibleProductStoreSlugsChange?: (storeSlugs: string[]) => void;
};

const SORT_LABELS: Record<CatalogSortValue, string> = {
  new: "Популярные",
  price_asc: "Дешевле",
  price_desc: "Дороже",
  name_asc: "По названию",
};

export function MapCategoryPickerPanel({
  categories,
  storeBusinessTypeTiles,
  storeCards,
  productsEmptyMessage,
  storeTypesEmptyMessage,
  initialTab = "products",
  productsAreSubcategories = false,
  parentCategoryName = null,
  parentCategorySlug = null,
  parentCategoryId = null,
  selectedSubcategory = null,
  initialSubcategoryProducts = null,
  initialSearchProducts = null,
  searchQuery = null,
  productsBackHref = "/map/categories",
  onVisibleProductStoreSlugsChange,
}: Props) {
  const isSearchResultsView = Boolean(searchQuery && initialSearchProducts);
  const [tab, setTab] = useState<Tab>(initialTab);
  const isProductsListView = Boolean(selectedSubcategory && initialSubcategoryProducts) || isSearchResultsView;
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = normalizeCatalogSort(searchParams.get("sort") ?? undefined);
  const fallbackRootAsLeaf = useMemo(
    () =>
      productsAreSubcategories &&
      categories.length === 0 &&
      parentCategoryId &&
      parentCategoryName
        ? { id: parentCategoryId, name: parentCategoryName, slug: parentCategorySlug ?? "" }
        : null,
    [categories.length, parentCategoryId, parentCategoryName, parentCategorySlug, productsAreSubcategories],
  );
  const effectiveSelectedCategory = selectedSubcategory ?? fallbackRootAsLeaf;
  const effectiveSelectedCategoryId = effectiveSelectedCategory?.id ?? null;
  const [mapRadiusKm, setMapRadiusKm] = useState<number>(getSearchRadiusKm());
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(getUserLocation());
  const [radiusAwareProducts, setRadiusAwareProducts] = useState(initialSearchProducts ?? initialSubcategoryProducts);
  const productCountLine = useMemo(
    () => formatCatalogProductCount((radiusAwareProducts ?? initialSubcategoryProducts)?.total ?? 0),
    [initialSubcategoryProducts, radiusAwareProducts],
  );
  const effectiveProducts = radiusAwareProducts ?? initialSearchProducts ?? initialSubcategoryProducts;
  const geoQueryParams = useMemo(() => {
    if (!mapLocation || !(mapRadiusKm > 0)) return undefined;
    return {
      lat: String(mapLocation.lat),
      lng: String(mapLocation.lng),
      radiusKm: String(mapRadiusKm),
    };
  }, [mapLocation, mapRadiusKm]);
  const backToCatalogSearchHref = useMemo(() => {
    if (!searchQuery) return "/search";
    const params = new URLSearchParams();
    params.set("q", searchQuery);
    const keys = [
      "sort",
      "minPrice",
      "maxPrice",
      "lat",
      "lng",
      "radiusKm",
      "businessTypes",
      "fulfillment",
    ] as const;
    for (const k of keys) {
      for (const v of searchParams.getAll(k)) {
        const value = v.trim();
        if (value) params.append(k, value);
      }
    }
    return `/search?${params.toString()}`;
  }, [searchParams, searchQuery]);
  const selectedStoreTypes = useMemo(
    () =>
      (searchParams.get("types") ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [searchParams],
  );
  const hasSelectedStoreType = selectedStoreTypes.length > 0;
  const storeSearchQuery = useMemo(() => (searchParams.get("q") ?? "").trim(), [searchParams]);
  const hasStoreSearchQuery = storeSearchQuery.length > 0;
  const visibleStoreCards = useMemo(() => {
    if (!hasStoreSearchQuery) return storeCards;
    const needle = storeSearchQuery.toLowerCase();
    return storeCards.filter((store) => {
      const byName = store.name.toLowerCase().includes(needle);
      const byType = store.businessTypes.some((t) => storeBusinessTypeLabel(t).toLowerCase().includes(needle));
      return byName || byType;
    });
  }, [hasStoreSearchQuery, storeCards, storeSearchQuery]);
  const shouldShowStoreResults = hasSelectedStoreType || hasStoreSearchQuery;
  const selectedStoreTypeHeading = useMemo(() => {
    const selectedType = selectedStoreTypes[0];
    if (!selectedType) return "Выберите тип магазина";
    const selectedTile = storeBusinessTypeTiles.find((tile) => tile.value === selectedType);
    return selectedTile?.label?.trim() || selectedType;
  }, [selectedStoreTypes, storeBusinessTypeTiles]);
  const storesHeading = useMemo(() => {
    if (hasStoreSearchQuery && !hasSelectedStoreType) return "Результаты поиска магазинов";
    return selectedStoreTypeHeading;
  }, [hasSelectedStoreType, hasStoreSearchQuery, selectedStoreTypeHeading]);
  const storesBackHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tab", "stores");
    const keys = ["q", "lat", "lng", "radiusKm"] as const;
    for (const key of keys) {
      const value = searchParams.get(key)?.trim();
      if (value) params.set(key, value);
    }
    return `/map/categories?${params.toString()}`;
  }, [searchParams]);

  function normalizeTelegramHref(raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^t\.me\//i.test(v)) return `https://${v}`;
    const username = v.replace(/^@+/, "").trim();
    if (!username) return null;
    return `https://t.me/${encodeURIComponent(username)}`;
  }

  function normalizeWhatsAppHref(raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^(wa\.me|api\.whatsapp\.com)\//i.test(v)) return `https://${v}`;
    const phone = v.replace(/[^\d+]/g, "").replace(/^\+/, "");
    if (!phone) return null;
    return `https://wa.me/${encodeURIComponent(phone)}`;
  }

  useEffect(() => {
    const sync = () => {
      setMapLocation(getUserLocation());
      setMapRadiusKm(getSearchRadiusKm());
    };
    sync();
    window.addEventListener("user-location-changed", sync);
    window.addEventListener("search-radius-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("user-location-changed", sync);
      window.removeEventListener("search-radius-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!effectiveSelectedCategoryId && !searchQuery) {
      setRadiusAwareProducts(initialSearchProducts ?? initialSubcategoryProducts);
      return;
    }
    const params = new URLSearchParams();
    if (effectiveSelectedCategoryId && !searchQuery) params.set("category", effectiveSelectedCategoryId);
    if (searchQuery) params.set("q", searchQuery);
    params.set("offset", "0");
    params.set("limit", "15");
    params.set("sort", currentSort);
    if (geoQueryParams) {
      params.set("lat", geoQueryParams.lat);
      params.set("lng", geoQueryParams.lng);
      params.set("radiusKm", geoQueryParams.radiusKm);
    }
    const endpoint = searchQuery ? "/api/search" : "/api/products";
    void fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.items)) return;
        setRadiusAwareProducts({
          items: data.items as CatalogProductItem[],
          hasMore: Boolean(data.hasMore),
          total:
            typeof data.total === "number"
              ? data.total
              : typeof data.offset === "number" && data.hasMore === false
                ? data.offset + data.items.length
                : data.items.length,
        });
      })
      .catch(() => {
        if (!cancelled) setRadiusAwareProducts(initialSearchProducts ?? initialSubcategoryProducts);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSort, effectiveSelectedCategoryId, geoQueryParams, initialSearchProducts, initialSubcategoryProducts, searchQuery]);

  useEffect(() => {
    if (!onVisibleProductStoreSlugsChange) return;
    if (tab !== "products") {
      onVisibleProductStoreSlugsChange([]);
      return;
    }
    if (!effectiveSelectedCategory && !(productsAreSubcategories && parentCategoryId) && !searchQuery) {
      onVisibleProductStoreSlugsChange([]);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams();
    const storeSlugCategory = effectiveSelectedCategory?.id ?? parentCategoryId ?? "";
    if (storeSlugCategory) params.set("category", storeSlugCategory);
    if (searchQuery) params.set("q", searchQuery);
    params.set("result", "storeSlugs");
    if (geoQueryParams) {
      params.set("lat", geoQueryParams.lat);
      params.set("lng", geoQueryParams.lng);
      params.set("radiusKm", geoQueryParams.radiusKm);
    }
    void fetch(`/api/products?${params.toString()}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const storeSlugs = Array.isArray(data?.storeSlugs)
          ? (data.storeSlugs as unknown[]).filter(
              (slug): slug is string => typeof slug === "string" && slug.length > 0,
            )
          : [];
        const uniqueStoreSlugs = Array.from(new Set(storeSlugs));
        onVisibleProductStoreSlugsChange(uniqueStoreSlugs);
      })
      .catch(() => {
        if (!cancelled) onVisibleProductStoreSlugsChange([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    effectiveSelectedCategory,
    geoQueryParams,
    onVisibleProductStoreSlugsChange,
    parentCategoryId,
    productsAreSubcategories,
    searchQuery,
    tab,
  ]);

  function onSortChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextSort = normalizeCatalogSort(e.target.value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", nextSort);
    router.push(`/map/categories?${params.toString()}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-4 pt-4 sm:gap-4 md:px-6 xl:px-8">
        <Link href="/" className="shrink-0" aria-label="На главную">
          <Image
            src="/mlavka/img/logo.svg"
            alt=""
            width={227}
            height={38}
            className="hidden h-[28px] w-auto sm:block md:h-[34px]"
            priority
          />
          <Image
            src="/mlavka/img/logo-mob.svg"
            alt=""
            width={120}
            height={32}
            className="h-[28px] w-auto sm:hidden"
            priority
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center sm:flex-initial sm:justify-start">
          <div
            className="inline-flex overflow-hidden rounded-md border border-blueExtraLight bg-blueUltraLight/80 shadow-sm sm:rounded-lg"
            role="tablist"
            aria-label="Режим карты"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "products"}
              onClick={() => setTab("products")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[12px] ${
                tab === "products"
                  ? "bg-blue text-white"
                  : "text-blueSteel hover:bg-white/90"
              }`}
            >
              {tab === "products" ? (
                <Image
                  src="/icon/tovari.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="h-4 w-4 shrink-0"
                  unoptimized
                />
              ) : (
                <Image
                  src="/icon/tovari-steel.svg"
                  alt=""
                  width={18}
                  height={18}
                  className="h-4 w-4 shrink-0"
                  unoptimized
                />
              )}
              Товары
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "stores"}
              onClick={() => setTab("stores")}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[12px] ${
                tab === "stores"
                  ? "bg-blue text-white"
                  : "text-blueSteel hover:bg-white/90"
              }`}
            >
              {tab === "stores" ? (
                <Image
                  src="/mlavka/img/shop-icon.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 brightness-0 invert"
                  unoptimized
                />
              ) : (
                <MapTabShopIconMuted />
              )}
              Магазины
            </button>
          </div>
        </div>

        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:ms-auto sm:w-auto">
          <Link
            href="/catalog"
            prefetch={false}
            className="text-[12px] font-normal text-[#3E6897] sm:text-[13px]"
          >
            Закрыть карту
          </Link>
          <Link
            href="/catalog"
            prefetch={false}
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-[#3E6897] shadow-none transition-colors hover:bg-blue hover:text-white"
            aria-label="Закрыть карту"
          >
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden className="h-9 w-9">
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
          </Link>
        </div>
      </div>

      <div className="mt-4 h-px w-full shrink-0 bg-[#B7C5D5]" aria-hidden />

      {/* Поиск вне overflow-y-auto — иначе обрезаются подсказки как на главной. */}
      <div className="relative z-30 mx-auto w-full max-w-[720px] shrink-0 px-4 pt-5 md:px-6 lg:mr-0 lg:max-w-none lg:pl-4 lg:pr-6 xl:pl-6 xl:pr-8">
        <div className="mb-5 w-full min-w-0">
          <HomeHeroSearchForm tab={tab === "products" ? "products" : "stores"} variant="map" />
        </div>
      </div>

      <div className="relative z-0 mx-auto min-h-0 w-full max-w-[720px] flex-1 overflow-y-auto px-4 pb-10 md:px-6 lg:mr-0 lg:max-w-none lg:pl-4 lg:pr-6 xl:pl-6 xl:pr-8 [-webkit-overflow-scrolling:touch]">
        {tab === "products" ? (
          <div className="flex min-h-full flex-col">
            {productsAreSubcategories || isProductsListView ? (
              <div className="flex min-h-[39px] items-center gap-2">
                {!isSearchResultsView ? (
                  <Link
                    href={productsBackHref}
                    prefetch={false}
                    className="group inline-flex h-[39px] w-[39px] items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-[#3E6897] shadow-none transition-colors hover:bg-blue hover:text-white"
                    aria-label="Назад к категориям"
                  >
                    <svg width="39" height="39" viewBox="0 0 39 39" fill="none" aria-hidden className="h-[39px] w-[39px]">
                      <rect
                        x="0.5"
                        y="0.5"
                        width="38"
                        height="38"
                        rx="19"
                        fill="currentColor"
                        fillOpacity="0.08"
                        className="transition-[fill,stroke] group-hover:fill-white/20"
                      />
                      <rect x="11" y="18.2109" width="19" height="2" rx="1" fill="currentColor" />
                      <rect
                        x="10"
                        y="19.2168"
                        width="8.79133"
                        height="1.99718"
                        rx="0.998588"
                        transform="rotate(-45 10 19.2168)"
                        fill="currentColor"
                      />
                      <rect
                        width="9.08064"
                        height="2"
                        rx="1"
                        transform="matrix(0.707107 0.707107 0.707107 -0.707107 10 19.207)"
                        fill="currentColor"
                      />
                    </svg>
                  </Link>
                ) : null}
                <h1 className="flex min-h-[39px] items-center text-base font-extrabold text-blueNavy md:text-lg lg:text-xl">
                  {isSearchResultsView
                    ? `Результаты поиска: "${searchQuery}"`
                    : productsAreSubcategories
                      ? (parentCategoryName ?? "Выберите подкатегорию")
                      : selectedSubcategory?.name}
                </h1>
              </div>
            ) : (
              <h1 className="flex min-h-[39px] items-center text-base font-extrabold text-blueNavy md:text-lg lg:text-xl">
                Выберите категорию товаров
              </h1>
            )}
            {(effectiveSelectedCategory || isSearchResultsView) && effectiveProducts ? (
              <>
                <div className="mb-4 mt-4 hidden items-center justify-between border-b border-graySoft pb-[15px] lg:flex">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-blueNavy">
                      {isSearchResultsView ? `Найдено ${productCountLine}` : productCountLine}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSearchResultsView ? (
                      <Link
                        href={backToCatalogSearchHref}
                        prefetch={false}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-blueExtraLight bg-white px-3 text-[13px] font-medium text-blueNavy transition-colors hover:bg-blueUltraLight"
                      >
                        Перейти в каталог
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-3 text-[13px] font-medium text-blueNavy transition-colors hover:bg-blueUltraLight"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden className="shrink-0">
                          <path d="M2 4.5H16" stroke="#3E6897" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M2 9H16" stroke="#3E6897" strokeWidth="1.8" strokeLinecap="round" />
                          <path d="M2 13.5H16" stroke="#3E6897" strokeWidth="1.8" strokeLinecap="round" />
                          <circle cx="6" cy="4.5" r="1.8" fill="#3E6897" />
                          <circle cx="11.5" cy="9" r="1.8" fill="#3E6897" />
                          <circle cx="8.5" cy="13.5" r="1.8" fill="#3E6897" />
                        </svg>
                        Параметры поиска
                      </button>
                    )}
                    <label htmlFor="map-products-sort" className="sr-only">
                      Сортировка
                    </label>
                    <select
                      id="map-products-sort"
                      value={currentSort}
                      onChange={onSortChange}
                      className="w-[158px] cursor-pointer appearance-none rounded-md border border-blueExtraLight bg-white bg-[length:10px_6px] bg-[right_10px_center] bg-no-repeat py-3 ps-2.5 pe-8 text-xs font-medium text-blueSteel outline-none focus:border-blueLight"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 10 6'%3E%3Cpath stroke='%233E6897' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 1 4 4 4-4'/%3E%3C/svg%3E")`,
                      }}
                    >
                      {(Object.keys(SORT_LABELS) as CatalogSortValue[]).map((v) => (
                        <option key={v} value={v}>
                          {SORT_LABELS[v]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-7">
                  <CatalogProductGrid
                    initialItems={effectiveProducts.items}
                    initialHasMore={effectiveProducts.hasMore}
                    category={isSearchResultsView ? undefined : effectiveSelectedCategory?.id}
                    ftsQuery={isSearchResultsView ? searchQuery ?? undefined : undefined}
                    sort={currentSort}
                    initialSkip={0}
                    pageSize={15}
                    gridClassName="grid grid-cols-3 gap-[15px] gap-y-[12px] items-stretch"
                    extraQueryParams={{
                      ...(geoQueryParams ?? {}),
                    }}
                  />
                </div>
              </>
            ) : categories.length === 0 ? (
              <div className="mt-2 flex flex-1 items-center">
                <EmptyState
                  title="Ничего не найдено"
                  description={
                    productsEmptyMessage ??
                    "В вашем радиусе нет доступных магазинов и товаров. Попробуйте увеличить радиус поиска."
                  }
                  className="min-h-[220px] py-8"
                />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-x-[15px] gap-y-[10px] min-[520px]:grid-cols-2 md:grid-cols-3 md:gap-y-[18px]">
                {categories.map((cat, index) => (
                  <CatalogCategoryCardLink
                    key={cat.id}
                    href={
                      productsAreSubcategories
                        ? `/map/categories?category=${encodeURIComponent(parentCategorySlug ?? "")}&subcategory=${encodeURIComponent(cat.slug)}`
                        : `/map/categories?category=${encodeURIComponent(cat.slug)}`
                    }
                    name={cat.name}
                    count={cat.count}
                    styleIndex={index}
                    preventScrollReset
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-full flex-col">
            <div className="flex min-h-[39px] items-center gap-2">
              {shouldShowStoreResults ? (
                <Link
                  href={storesBackHref}
                  prefetch={false}
                  className="group inline-flex h-[39px] w-[39px] items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-[#3E6897] shadow-none transition-colors hover:bg-blue hover:text-white"
                  aria-label="Назад к типам магазинов"
                >
                  <svg width="39" height="39" viewBox="0 0 39 39" fill="none" aria-hidden className="h-[39px] w-[39px]">
                    <rect
                      x="0.5"
                      y="0.5"
                      width="38"
                      height="38"
                      rx="19"
                      fill="currentColor"
                      fillOpacity="0.08"
                      className="transition-[fill,stroke] group-hover:fill-white/20"
                    />
                    <rect x="11" y="18.2109" width="19" height="2" rx="1" fill="currentColor" />
                    <rect
                      x="10"
                      y="19.2168"
                      width="8.79133"
                      height="1.99718"
                      rx="0.998588"
                      transform="rotate(-45 10 19.2168)"
                      fill="currentColor"
                    />
                    <rect
                      width="9.08064"
                      height="2"
                      rx="1"
                      transform="matrix(0.707107 0.707107 0.707107 -0.707107 10 19.207)"
                      fill="currentColor"
                    />
                  </svg>
                </Link>
              ) : null}
              <h1 className="flex min-h-[39px] items-center text-base font-extrabold text-blueNavy md:text-lg lg:text-xl">
                {storesHeading}
              </h1>
            </div>
            {shouldShowStoreResults ? (
              <div className="mt-4 flex min-h-full flex-col gap-4">
                <div className="border-b border-graySoft pb-[12px]">
                  <span className="text-[13px] font-medium text-blueNavy">
                    {hasStoreSearchQuery
                      ? `Найдено ${visibleStoreCards.length.toLocaleString("ru-RU")}`
                      : `Магазинов ${visibleStoreCards.length.toLocaleString("ru-RU")}`}
                  </span>
                </div>
                {visibleStoreCards.length === 0 ? (
                  <EmptyState
                    description="В вашем радиусе нет доступных магазинов и товаров. Попробуйте увеличить радиус поиска."
                    className="min-h-[200px] py-8"
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {visibleStoreCards.map((store) => {
                      const telegramHref = store.telegramUrl ? normalizeTelegramHref(store.telegramUrl) : null;
                      const whatsappHref = store.whatsappUrl ? normalizeWhatsAppHref(store.whatsappUrl) : null;
                      const storeHref = `/stores/${encodeURIComponent(store.slug)}`;
                      return (
                        <article
                          key={store.id}
                          className="cursor-pointer rounded-xl border border-blueExtraLight bg-white p-[20px] shadow-[0px_10px_34px_0px_#5f7e4426]"
                          role="link"
                          tabIndex={0}
                          onClick={(e) => {
                            const target = e.target as HTMLElement | null;
                            if (target?.closest("a,button,input,textarea,select,label")) return;
                            router.push(storeHref);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            router.push(storeHref);
                          }}
                        >
                          <div className="flex flex-col gap-[10px]">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-[55px] w-[190px] items-center justify-center rounded-md ${
                                  store.logo?.trim() ? "bg-white" : "bg-[#F3F8FF]"
                                }`}
                              >
                                {store.logo?.trim() ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={store.logo.trim()} alt="" className="h-[55px] w-auto max-w-[180px] object-contain" />
                                ) : (
                                  <span className="text-[10px] font-medium text-blueSteel">нет логотипа</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#3E6897]">
                                    {store.businessTypes.map((t) => storeBusinessTypeLabel(t)).join(", ") || "Магазин"}
                                  </p>
                                  <p className="shrink-0 text-[12px] font-normal text-blueNavy">
                                    Товаров: <span className="font-semibold">{store.productsCount}</span>
                                  </p>
                                </div>
                                <Link
                                  href={storeHref}
                                  prefetch={false}
                                  className="truncate text-base font-extrabold text-[#032339] hover:text-blue"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {store.name}
                                </Link>
                              </div>
                            </div>
                            <div className="flex flex-col gap-[6px]">
                              {store.address?.trim() ? (
                                <p className="text-[12px] font-normal text-blueSteel">
                                  Адрес: <span className="font-semibold text-[#052850]">{store.address.trim()}</span>
                                </p>
                              ) : null}
                              {store.workDescription?.trim() ? (
                                <p className="text-[12px] font-normal text-blueSteel">
                                  Режим работы: <span className="font-semibold">{store.workDescription.trim()}</span>
                                </p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                                {telegramHref ? (
                                  <a href={telegramHref} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]" aria-label="Telegram">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/icon/telegram-store.svg" alt="" width={40} height={40} className="h-10 w-10" />
                                  </a>
                                ) : null}
                                {store.vkUrl?.trim() ? (
                                  <a href={store.vkUrl.trim()} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]" aria-label="VK">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/icon/vk-store.svg" alt="" width={40} height={40} className="h-10 w-10" />
                                  </a>
                                ) : null}
                                {whatsappHref ? (
                                  <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]" aria-label="WhatsApp">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/icon/whatsapp-store.svg" alt="" width={40} height={40} className="h-10 w-10" />
                                  </a>
                                ) : null}
                                {store.otherMessengerUrl?.trim() ? (
                                  <a href={store.otherMessengerUrl.trim()} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]" aria-label="MAX">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/icon/max-store.svg" alt="" width={40} height={40} className="h-10 w-10" />
                                  </a>
                                ) : null}
                                {store.phone?.trim() ? (
                                  <a href={`tel:${store.phone.trim().replace(/\s/g, "")}`} className="inline-flex items-center text-[16px] font-medium text-[#032339]">
                                    {store.phone.trim()}
                                  </a>
                                ) : null}
                              </div>
                              <RouteToStoreLink
                                storeLatitude={store.latitude}
                                storeLongitude={store.longitude}
                                storeAddress={store.address}
                                storeName={store.name}
                                className="ml-auto inline-flex h-[45px] min-h-[45px] w-[177px] items-center justify-center gap-2 whitespace-nowrap rounded-xl rounded-br-none border border-blue bg-white px-3 text-center text-[12px] font-semibold leading-tight text-blue transition-colors hover:bg-blueUltraLight"
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden
                                  className="h-[18px] w-[18px] shrink-0 text-blue"
                                >
                                  <circle cx="6" cy="19" r="2" stroke="currentColor" strokeWidth="1.4" />
                                  <circle cx="18" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
                                  <path
                                    d="M12 19H16.5C17.4283 19 18.3185 18.6313 18.9749 17.9749C19.6313 17.3185 20 16.4283 20 15.5C20 14.5717 19.6313 13.6815 18.9749 13.0251C18.3185 12.3687 17.4283 12 16.5 12H8.5C7.57174 12 6.6815 11.6313 6.02513 10.9749C5.36875 10.3185 5 9.42826 5 8.5C5 7.57174 5.36875 6.6815 6.02513 6.02513C6.6815 5.36875 7.57174 5 8.5 5H12"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                Построить маршрут
                              </RouteToStoreLink>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : storeBusinessTypeTiles.length === 0 ? (
              <div className="mt-2 flex flex-1 items-center">
                <EmptyState
                  title="Ничего не найдено"
                  description={
                    storeTypesEmptyMessage ??
                    "В вашем радиусе нет доступных магазинов и товаров. Попробуйте увеличить радиус поиска."
                  }
                  className="min-h-[220px] py-8"
                />
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-x-[15px] gap-y-[10px] min-[520px]:grid-cols-2 md:grid-cols-3 md:gap-y-[18px]">
                {storeBusinessTypeTiles.map((tile, index) => (
                  <MapStoreBusinessTypeTileLink
                    key={tile.value}
                    value={tile.value}
                    label={tile.label}
                    count={tile.count}
                    styleIndex={index}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
