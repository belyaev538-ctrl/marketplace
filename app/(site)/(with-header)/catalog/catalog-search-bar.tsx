"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { productPublicPath } from "@/lib/product-url";
import { ProductSearchSuggestions } from "@/components/product-search-suggestions";
import type { ProductSearchHit } from "@/hooks/use-product-search-suggest";
import { useProductSearchSuggest } from "@/hooks/use-product-search-suggest";
import { getSearchRadiusKm } from "@/lib/search-radius-preference";
import { getUserLocation } from "@/lib/user-location";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";

/** Тонер поверх страницы при фокусе в поиске: #052551 @ 55 %. */
const SEARCH_FOCUS_SCRIM = "rgba(5, 37, 81, 0.55)";

const MIN_QUERY_LEN = 2;
const SUGGESTIONS_LIST_ID = "catalog-search-suggestions";

type CatalogSearchBarProps = {
  /** Ссылка «Показать на карте» (например `/map/categories?tab=stores` со страницы магазинов). */
  showOnMapHref?: string;
  /** Вариант поиска: товары (по умолчанию) или магазины. */
  mode?: "products" | "stores";
};

export function CatalogSearchBar({
  showOnMapHref = "/map/categories",
  mode = "products",
}: CatalogSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    q,
    setQuery,
    debounced,
    open,
    loading,
    hits,
    wrapRef,
    closeSuggestions,
    onFocusInput,
  } = useProductSearchSuggest({
    suggestEnabled: mode === "products",
    minQueryLength: MIN_QUERY_LEN,
    initialQuery: searchParams.get("q") ?? "",
  });

  const clearBlurTimer = useCallback(() => {
    if (blurCloseTimer.current != null) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
  }, []);

  const onInputFocus = useCallback(() => {
    clearBlurTimer();
    setSearchFocused(true);
    onFocusInput();
  }, [clearBlurTimer, onFocusInput]);

  const onInputBlur = useCallback(() => {
    clearBlurTimer();
    blurCloseTimer.current = setTimeout(() => {
      setSearchFocused(false);
      closeSuggestions();
    }, 150);
  }, [clearBlurTimer, closeSuggestions]);

  const onScrimMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      inputRef.current?.blur();
      setSearchFocused(false);
      closeSuggestions();
    },
    [closeSuggestions],
  );

  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  const showSuggestions = mode === "products" && open && debounced.length >= MIN_QUERY_LEN;
  const showQueryChip = q.trim().length > 0 && !searchFocused;

  useEffect(() => {
    if (!searchFocused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        inputRef.current?.blur();
        closeSuggestions();
        setSearchFocused(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchFocused, closeSuggestions]);

  useEffect(() => () => clearBlurTimer(), [clearBlurTimer]);

  const buildStoresHref = useCallback((query: string) => {
    const params = new URLSearchParams();
    const t = query.trim();
    if (t) params.set("q", t);
    const loc = getUserLocation();
    if (loc) {
      params.set("lat", String(loc.lat));
      params.set("lng", String(loc.lng));
      params.set("radiusKm", String(getSearchRadiusKm()));
    }
    const s = params.toString();
    return s ? `/stores?${s}` : "/stores";
  }, []);

  const goToSearchResults = useCallback(() => {
    const t = q.trim();
    if (t.length < MIN_QUERY_LEN) return;
    router.push(mode === "stores" ? buildStoresHref(t) : `/search?q=${encodeURIComponent(t)}`);
    inputRef.current?.blur();
    closeSuggestions();
    setSearchFocused(false);
  }, [q, router, closeSuggestions, mode, buildStoresHref]);

  const goToHit = useCallback(
    (hit: ProductSearchHit) => {
      const slug = hit.slug?.trim();
      if (slug) {
        const path = productPublicPath(hit.storeSlug, slug);
        if (path) router.push(path);
      } else {
        goToSearchResults();
      }
      inputRef.current?.blur();
      closeSuggestions();
      setSearchFocused(false);
    },
    [router, goToSearchResults, closeSuggestions],
  );

  const onInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (hits.length === 0) return;
        setActiveIndex((i) => (i < hits.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (hits.length === 0) return;
        setActiveIndex((i) => (i <= 0 ? hits.length - 1 : i - 1));
        return;
      }
      if (e.key === "Enter" && activeIndex >= 0 && hits[activeIndex]) {
        e.preventDefault();
        goToHit(hits[activeIndex]);
      }
    },
    [activeIndex, goToHit, showSuggestions, hits],
  );

  const searchAllMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      goToSearchResults();
    },
    [goToSearchResults],
  );

  const onSuggestionsPick = useCallback(() => {
    closeSuggestions();
    setSearchFocused(false);
  }, [closeSuggestions]);

  const focusSearchInput = useCallback(() => {
    setSearchFocused(true);
    onFocusInput();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const len = inputRef.current?.value.length ?? 0;
      inputRef.current?.setSelectionRange(len, len);
    });
  }, [onFocusInput]);

  const mapResultsHref = useMemo(() => {
    const [basePath, baseQuery = ""] = showOnMapHref.split("?");
    const params = new URLSearchParams(baseQuery);
    const qParam = (searchParams.get("q") ?? "").trim();
    if (qParam) params.set("q", qParam);
    const keysToForward = [
      "sort",
      "minPrice",
      "maxPrice",
      "fulfillment",
      "businessTypes",
      "types",
      "lat",
      "lng",
      "radiusKm",
    ] as const;
    for (const key of keysToForward) {
      if (key === "fulfillment" || key === "businessTypes") {
        const values = searchParams.getAll(key).map((v) => v.trim()).filter(Boolean);
        if (values.length > 0) {
          params.delete(key);
          for (const value of values) params.append(key, value);
        }
        continue;
      }
      const value = (searchParams.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    if (!params.get("lat") || !params.get("lng") || !params.get("radiusKm")) {
      const loc = getUserLocation();
      if (loc) {
        params.set("lat", String(loc.lat));
        params.set("lng", String(loc.lng));
      }
      if (!params.get("radiusKm")) {
        params.set("radiusKm", String(getSearchRadiusKm()));
      }
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }, [searchParams, showOnMapHref]);

  return (
    <section className="searchProduct relative">
      {searchFocused ? (
        <div
          className="fixed inset-0 z-[20] cursor-default"
          style={{ backgroundColor: SEARCH_FOCUS_SCRIM }}
          aria-hidden
          onMouseDown={onScrimMouseDown}
        />
      ) : null}

      <div className="relative z-[30] mx-auto w-full max-w-[1385px] px-[15px]">
        <div className="catalog-search-bar-content flex flex-col gap-3.5 rounded-[15px] p-[15px] pt-[15px] md:px-[25px] md:pb-[25px]">
          <div className="flex flex-col items-start gap-2.5 md:flex-row md:items-center">
            <h3 className="text-base font-bold leading-none text-white">
              {mode === "stores" ? "Поиск магазинов" : "Поиск товаров"}
            </h3>
            <p className="catalog-search-hint-badge hidden max-w-full rounded-sm pt-1 pe-1.5 pb-1.5 ps-4 text-blueNavy md:block md:max-w-none">
              {mode === "stores"
                ? "Поиск магазинов и просмотр их товаров"
                : "Ищите товары на доставку, самовывоз или просто смотрите и заезжайте в магазины"}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center md:gap-5">
            <div ref={wrapRef} className="relative z-10 w-full flex-1">
              <form
                action={mode === "stores" ? "/stores" : "/search"}
                method="get"
                className="relative z-10 w-full"
                onSubmit={(e) => {
                  if (mode !== "stores") return;
                  e.preventDefault();
                  router.push(buildStoresHref(q));
                  inputRef.current?.blur();
                  closeSuggestions();
                  setSearchFocused(false);
                }}
              >
                <div
                  className={`flex h-[42px] items-center border border-blueExtraLight bg-blueUltraLight transition-all duration-200 md:h-14 ${
                    showSuggestions
                      ? "rounded-t-md rounded-b-none border-b-0 md:rounded-t-xl md:rounded-b-none"
                      : "rounded-md md:rounded-xl"
                  }`}
                >
                  {showQueryChip ? (
                    <div className="flex h-full w-full flex-1 items-center pl-[4px] pr-[11px] md:pr-4">
                      <input type="hidden" name="q" value={q} />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={focusSearchInput}
                        className="my-[4px] inline-flex h-[34px] max-w-full items-center gap-2 rounded-md bg-[#DEECFF] px-[15px] text-[15px] font-medium text-blueNavy md:h-[46px]"
                        aria-label="Изменить запрос"
                      >
                        <span className="truncate">{q}</span>
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue text-white transition-colors hover:bg-[#0057BE]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuery("");
                            closeSuggestions();
                          }}
                          aria-label="Очистить запрос"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setQuery("");
                              closeSuggestions();
                            }
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                            <path
                              d="M1 1L9 9M9 1L1 9"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      </button>
                    </div>
                  ) : (
                    <input
                      ref={inputRef}
                      id="catalog-search-q"
                      name="q"
                      type="search"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions}
                      aria-controls={showSuggestions ? SUGGESTIONS_LIST_ID : undefined}
                      placeholder={
                        mode === "stores"
                          ? "Введите название магазина или тип магазина..."
                          : "Напишите, что вы ищете! Мы подскажем где купить..."
                      }
                      value={q}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={onInputFocus}
                      onBlur={onInputBlur}
                      onKeyDown={onInputKeyDown}
                      className="catalog-search-bar-input h-full w-full flex-1 rounded-md bg-blueUltraLight px-[11px] py-[13px] text-xs font-medium text-blueNavy outline-none md:rounded-xl md:px-4 md:py-2 md:text-sm"
                    />
                  )}
                  <button
                    type="submit"
                    className="-me-px flex h-[42px] w-[42px] shrink-0 items-center justify-center gap-2 rounded-br-md rounded-tr-md bg-green text-sm font-bold text-white transition-colors hover:bg-[#318D05] md:h-14 md:w-[131px] md:rounded-tr-xl md:px-5"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <Image src="/mlavka/img/search-icon.svg" alt="" width={20} height={20} />
                    <span className="hidden md:inline">Найти</span>
                  </button>
                </div>

                {showSuggestions ? (
                  <div
                    id={SUGGESTIONS_LIST_ID}
                    className="absolute left-0 right-0 top-full z-50 max-h-[min(70vh,320px)] overflow-y-auto rounded-b-md border border-t-0 border-blueExtraLight bg-white shadow-lg shadow-[#3458821a] md:rounded-b-xl [-webkit-overflow-scrolling:touch]"
                  >
                    <ProductSearchSuggestions
                      loading={loading}
                      hits={hits}
                      onPick={onSuggestionsPick}
                      highlightIndex={activeIndex}
                      onHighlightIndexChange={setActiveIndex}
                    />
                    <div className="border-t border-blueExtraLight">
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-start text-xs font-semibold text-blue transition-colors hover:bg-blueUltraLight"
                        onMouseDown={searchAllMouseDown}
                      >
                        Все результаты
                      </button>
                    </div>
                  </div>
                ) : null}
              </form>
            </div>
            <Link
              href={mapResultsHref}
              prefetch={false}
              className="relative z-10 inline-flex max-w-fit items-center gap-[7px] whitespace-nowrap rounded-md bg-blue px-[13px] py-3 text-xs font-medium text-white transition-colors hover:bg-[#0057BE] lg:h-14 lg:min-w-[220px] lg:justify-center lg:gap-2.5 lg:rounded-xl lg:px-9 lg:py-[15px] lg:text-sm"
            >
              <Image
                src="/mlavka/img/map-cart.svg"
                alt=""
                width={20}
                height={20}
                className="h-[17px] w-auto lg:w-auto"
              />
              Показать на карте
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
