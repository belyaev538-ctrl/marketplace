"use client";

import { useCallback, useEffect, useState } from "react";
import { MapCategoryPickerPanel, type MapCategoryPickerCategory } from "@/components/map/map-category-picker-panel";
import { StoresMapWithUserLocation } from "@/components/map/stores-map-with-user-location";
import { EmptyState } from "@/components/ui/empty-state";
import type { CatalogProductItem } from "@/app/(site)/(with-header)/catalog/catalog-product-grid";
import { getSearchRadiusKm } from "@/lib/search-radius-preference";
import { getUserLocation } from "@/lib/user-location";
import type { StoreBusinessTypeTileDTO } from "@/lib/store-business-type";
import type { YandexMapStorePoint } from "@/components/map/yandex-map";

type Props = {
  initialCategories: MapCategoryPickerCategory[];
  initialStoreBusinessTypeTiles: StoreBusinessTypeTileDTO[];
  stores: YandexMapStorePoint[];
  storeCards: import("@/components/map/map-category-picker-panel").MapStoreCardItem[];
  initialMapTab?: "products" | "stores";
  productsAreSubcategories?: boolean;
  parentCategoryName?: string | null;
  parentCategorySlug?: string | null;
  parentCategoryId?: string | null;
  selectedSubcategory?: { id: string; name: string; slug: string } | null;
  initialSubcategoryProducts?: { items: CatalogProductItem[]; hasMore: boolean; total: number } | null;
  initialSearchProducts?: { items: CatalogProductItem[]; hasMore: boolean; total: number } | null;
  searchQuery?: string | null;
  productsBackHref?: string;
};

type PanelJson = {
  categories: MapCategoryPickerCategory[];
  storeBusinessTypeTiles: StoreBusinessTypeTileDTO[];
};

export function MapCategoriesPageClient({
  initialCategories,
  initialStoreBusinessTypeTiles,
  stores,
  storeCards,
  initialMapTab = "products",
  productsAreSubcategories = false,
  parentCategoryName = null,
  parentCategorySlug = null,
  parentCategoryId = null,
  selectedSubcategory = null,
  initialSubcategoryProducts = null,
  initialSearchProducts = null,
  searchQuery = null,
  productsBackHref = "/map/categories",
}: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [tiles, setTiles] = useState(initialStoreBusinessTypeTiles);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [highlightedProductStoreSlugs, setHighlightedProductStoreSlugs] = useState<string[]>(
    (initialSearchProducts ?? initialSubcategoryProducts)
      ? Array.from(
          new Set(
            (initialSearchProducts ?? initialSubcategoryProducts)!.items
              .map((item) => item.storeSlug)
              .filter((slug): slug is string => typeof slug === "string" && slug.length > 0),
          ),
        )
      : [],
  );

  const syncLocationFlag = useCallback(() => {
    setHasUserLocation(getUserLocation() !== null);
  }, []);

  const loadPanelForRadius = useCallback(async () => {
    if (productsAreSubcategories) {
      const loc = getUserLocation();
      if (!loc || !parentCategorySlug) {
        setCategories(initialCategories);
        setTiles(initialStoreBusinessTypeTiles);
        return;
      }
      const r = getSearchRadiusKm();
      try {
        const res = await fetch(
          `/api/map/nearby-panel?lat=${encodeURIComponent(String(loc.lat))}&lng=${encodeURIComponent(String(loc.lng))}&radiusKm=${encodeURIComponent(String(r))}&parentCategorySlug=${encodeURIComponent(parentCategorySlug)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as PanelJson;
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } catch {
        /* ignore */
      }
      setTiles(initialStoreBusinessTypeTiles);
      return;
    }
    const loc = getUserLocation();
    if (!loc) {
      setCategories(initialCategories);
      setTiles(initialStoreBusinessTypeTiles);
      return;
    }
    const r = getSearchRadiusKm();
    try {
      const res = await fetch(
        `/api/map/nearby-panel?lat=${encodeURIComponent(String(loc.lat))}&lng=${encodeURIComponent(String(loc.lng))}&radiusKm=${encodeURIComponent(String(r))}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as PanelJson;
      if (Array.isArray(data.categories) && Array.isArray(data.storeBusinessTypeTiles)) {
        setCategories(data.categories);
        setTiles(data.storeBusinessTypeTiles);
      }
    } catch {
      /* ignore */
    }
  }, [initialCategories, initialStoreBusinessTypeTiles, parentCategorySlug, productsAreSubcategories]);

  useEffect(() => {
    syncLocationFlag();
  }, [syncLocationFlag]);

  useEffect(() => {
    void loadPanelForRadius();
    const onLoc = () => {
      syncLocationFlag();
      void loadPanelForRadius();
    };
    const onRadius = () => void loadPanelForRadius();
    window.addEventListener("user-location-changed", onLoc);
    window.addEventListener("search-radius-changed", onRadius);
    window.addEventListener("storage", onLoc);
    return () => {
      window.removeEventListener("user-location-changed", onLoc);
      window.removeEventListener("search-radius-changed", onRadius);
      window.removeEventListener("storage", onLoc);
    };
  }, [loadPanelForRadius, syncLocationFlag]);

  const productsEmptyMessage =
    hasUserLocation && categories.length === 0
      ? "В выбранном радиусе нет товаров по категориям. Увеличьте радиус поиска на карте или укажите другое местоположение."
      : undefined;

  const storeTypesEmptyMessage =
    hasUserLocation && tiles.length === 0
      ? "В выбранном радиусе нет магазинов с подходящими типами. Увеличьте радиус или измените местоположение."
      : undefined;

  return (
    <div className="flex min-h-0 w-full flex-col bg-white lg:min-h-[100dvh] lg:flex-row lg:items-stretch">
      <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col border-blueExtraLight lg:max-h-[100dvh] lg:max-w-[50%] lg:flex-none lg:basis-1/2 lg:border-r">
        <MapCategoryPickerPanel
          categories={categories}
          storeBusinessTypeTiles={tiles}
          storeCards={storeCards}
          productsEmptyMessage={productsEmptyMessage}
          storeTypesEmptyMessage={storeTypesEmptyMessage}
          initialTab={initialMapTab}
          productsAreSubcategories={productsAreSubcategories}
          parentCategoryName={parentCategoryName}
          parentCategorySlug={parentCategorySlug}
          parentCategoryId={parentCategoryId}
          selectedSubcategory={selectedSubcategory}
          initialSubcategoryProducts={initialSubcategoryProducts}
          initialSearchProducts={initialSearchProducts}
          searchQuery={searchQuery}
          productsBackHref={productsBackHref}
          onVisibleProductStoreSlugsChange={setHighlightedProductStoreSlugs}
        />
      </section>

      <aside
        className="relative flex min-h-[min(45dvh,420px)] w-full min-w-0 flex-1 flex-col bg-[#E8EAEE] lg:min-h-[100dvh] lg:sticky lg:top-0"
        aria-label="Карта магазинов"
      >
        {stores.length > 0 ? (
          <StoresMapWithUserLocation
            stores={stores}
            fill
            productCardStyle
            filterStoresInSearchRadius
            highlightedStoreSlugs={highlightedProductStoreSlugs}
          />
        ) : (
          <EmptyState className="flex-1" />
        )}
      </aside>
    </div>
  );
}
