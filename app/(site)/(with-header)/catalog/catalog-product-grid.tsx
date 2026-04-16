"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductImageWithSkeleton } from "@/components/product-image-with-skeleton";
import { productPublicPath } from "@/lib/product-url";

export type CatalogProductItem = {
  id: string;
  /** Только непустой slug; иначе ссылку на карточку не строим */
  slug: string | null;
  /** Slug магазина для канонического URL `/{store}/{product}`; если null — только `/product/:slug`. */
  storeSlug: string | null;
  name: string;
  price: number;
  imageUrl: string | null;
  /** Название магазина для строки над фото, как в макете */
  storeName: string;
  /** Логотип магазина (URL из БД), если есть */
  storeLogoUrl: string | null;
  /** Форматы работы магазина: delivery | pickup | offline */
  fulfillmentModes: string[];
};

type Props = {
  initialItems: CatalogProductItem[];
  initialHasMore: boolean;
  category?: string;
  store?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  fulfillment?: string[];
  /** Повторяющийся query `businessTypes=` */
  businessTypes?: string[];
  /** Смещение первой загруженной страницы из URL (`?offset=`) */
  initialSkip?: number;
  /** Полнотекстовый поиск: запросы к /api/search (append страниц). */
  ftsQuery?: string;
  /** Кастомные классы сетки карточек для отдельных страниц. */
  gridClassName?: string;
  /** Размер страницы для кнопки «Показать ещё». */
  pageSize?: number;
  /** Доп. query-параметры для API-страниц (например гео-радиус на карте). */
  extraQueryParams?: Record<string, string | number | undefined>;
};

const CATALOG_PRODUCTS_PAGE_SIZE = 25;
const FULFILLMENT_META: Record<string, { icon: string; hint: string }> = {
  delivery: { icon: "/mlavka/img/card-icon1.svg", hint: "Можно заказать доставку" },
  pickup: { icon: "/mlavka/img/card-icon2.svg", hint: "Можно оформить самовывоз" },
  offline: { icon: "/mlavka/img/card-icon3.svg", hint: "Продажа только в магазине" },
};

/** Legacy `both` в БД = доставка + самовывоз (согласовано с фильтром каталога). */
function fulfillmentModesForIcons(modes: string[]): Set<string> {
  const out = new Set<string>();
  for (const m of modes) {
    if (m === "both") {
      out.add("delivery");
      out.add("pickup");
    } else {
      out.add(m);
    }
  }
  return out;
}

/** Как .priceSpn в макете: «1 200,00 ₽». */
function formatPriceRubCatalog(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function CatalogProductGrid({
  initialItems,
  initialHasMore,
  category,
  store,
  minPrice,
  maxPrice,
  sort,
  fulfillment,
  businessTypes,
  initialSkip = 0,
  ftsQuery,
  gridClassName,
  pageSize = CATALOG_PRODUCTS_PAGE_SIZE,
  extraQueryParams,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [offset, setOffset] = useState(initialSkip + initialItems.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  useEffect(() => {
    setItems(initialItems);
    setHasMore(initialHasMore);
    setOffset(initialSkip + initialItems.length);
  }, [initialHasMore, initialItems, initialSkip]);

  async function loadMore() {
    setLoading(true);
    try {
      if (ftsQuery) {
        const params = new URLSearchParams();
        params.set("q", ftsQuery);
        params.set("offset", String(offset));
        params.set("limit", String(pageSize));
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (sort) params.set("sort", sort);
        for (const f of fulfillment ?? []) {
          const v = f.trim();
          if (v) params.append("fulfillment", v);
        }
        for (const b of businessTypes ?? []) {
          const v = b.trim();
          if (v) params.append("businessTypes", v);
        }
        if (extraQueryParams) {
          for (const [k, v] of Object.entries(extraQueryParams)) {
            if (v == null) continue;
            const s = String(v).trim();
            if (s !== "") params.set(k, s);
          }
        }
        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as {
          items: CatalogProductItem[];
          hasMore: boolean;
        };
        setItems((prev) => [...prev, ...data.items]);
        setOffset((prev) => prev + data.items.length);
        setHasMore(data.hasMore);
        return;
      }

      const params = new URLSearchParams();
      params.set("offset", String(offset));
      params.set("limit", String(pageSize));
      if (category) params.set("category", category);
      if (store) params.set("store", store);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (sort) params.set("sort", sort);
      if (extraQueryParams) {
        for (const [k, v] of Object.entries(extraQueryParams)) {
          if (v == null) continue;
          const s = String(v).trim();
          if (s !== "") params.set(k, s);
        }
      }
      for (const f of fulfillment ?? []) {
        const v = f.trim();
        if (v) params.append("fulfillment", v);
      }
      for (const b of businessTypes ?? []) {
        const v = b.trim();
        if (v) params.append("businessTypes", v);
      }
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load");
      }
      const data = (await res.json()) as {
        items: CatalogProductItem[];
        hasMore: boolean;
      };
      setItems((prev) => [...prev, ...data.items]);
      setOffset((prev) => prev + data.items.length);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="catalog-product-grid-root" style={{ overflowAnchor: "none" }}>
      <div
        className={
          gridClassName ??
          "grid grid-cols-2 gap-[15px] gap-y-[12px] items-stretch md:grid-cols-3 md:gap-x-[25px] md:gap-y-5 lg:grid-cols-4 xl:grid-cols-5"
        }
      >
        {items.map((product) => {
          const fulfillmentIconModes = fulfillmentModesForIcons(product.fulfillmentModes);
          const href =
            product.slug && product.slug.trim() !== ""
              ? productPublicPath(product.storeSlug, product.slug.trim())
              : null;
          const cardInnerClass =
            "flex min-h-0 min-w-0 flex-1 flex-col gap-[11px] md:gap-5 outline-none ring-blue focus-visible:ring-2";

          const body = (
            <>
              <div className="flex shrink-0 items-center gap-[7px]">
                <div
                  className="flex h-[25px] w-fit max-w-[110px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white"
                  aria-hidden
                >
                  {product.storeLogoUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element -- логотип магазина с произвольного URL
                    <img
                      src={product.storeLogoUrl.trim()}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-[20px] w-auto max-w-full object-contain opacity-75"
                    />
                  ) : (
                    <span className="px-0.5 text-center text-[5px] font-medium leading-[1.1] text-blueSteel md:text-[6px]">
                      нет логотипа
                    </span>
                  )}
                </div>
                <span className="min-w-0 truncate text-[9px] font-medium text-blueSteel md:text-[11px]">
                  {product.storeName}
                </span>
              </div>

              <div className="relative h-[186px] w-full shrink-0 overflow-hidden rounded-[10px] bg-blueUltraLight md:h-[231px]">
                {product.imageUrl ? (
                  <ProductImageWithSkeleton
                    src={product.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full rounded-[10px]"
                    imgClassName="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-blueSteel">
                    Нет фото
                  </div>
                )}
              </div>

              {/* Растягивается на высоту строки сетки: название сверху, цена и кнопка снизу на одной линии с соседними карточками */}
              <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 md:gap-4">
                <span className="title line-clamp-3 min-h-0 text-xs font-semibold leading-snug text-blueSteel2">
                  {product.name}
                </span>

                <div className="flex shrink-0 flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-[7px]">
                    {["delivery", "pickup", "offline"].map((mode) => {
                      if (!fulfillmentIconModes.has(mode)) return null;
                      const meta = FULFILLMENT_META[mode];
                      return (
                        <span
                          key={`${product.id}-${mode}`}
                          className="flex min-h-[30px] min-w-[30px] shrink-0 items-center justify-center rounded-[22px] rounded-br-none bg-blueUltraLight"
                          title={meta.hint}
                          aria-label={meta.hint}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={meta.icon}
                            alt=""
                            width={16}
                            height={16}
                            className="pointer-events-none h-4 w-4 shrink-0"
                          />
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex min-h-[42px] items-center justify-between gap-2 md:min-h-[45px]">
                    <b className="min-w-0 flex-1 text-xs font-bold tabular-nums leading-none text-blueSteel2">
                      {formatPriceRubCatalog(product.price)}
                    </b>
                    {href ? (
                      <span
                        className="group flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[15px] rounded-br-none bg-[#66c63826] transition-colors hover:bg-green md:h-[45px] md:w-[45px]"
                        aria-hidden
                      >
                        <span className="sr-only">Открыть товар</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/mlavka/img/shop-icon.png"
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 group-hover:hidden"
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/mlavka/img/shop-icon-white.png"
                          alt=""
                          width={16}
                          height={16}
                          className="hidden h-4 w-4 group-hover:block"
                        />
                      </span>
                    ) : (
                      <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center text-center text-[9px] font-medium leading-tight text-blueSteel md:h-[45px] md:w-[45px]">
                        —
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          );

          return (
            <div
              key={product.id}
              className={`catalog-product-card product_card flex h-full min-h-0 flex-col rounded-xl rounded-br-none bg-white p-3 shadow-[0px_10px_34px_0px_#5f7e4426] transition-all duration-300 ease-in-out hover:shadow-[0px_10px_33px_0px_#08428754] md:px-[15px] md:pt-[15px] md:pb-5 ${href ? "cursor-pointer" : ""}`}
            >
              {href ? (
                <Link href={href} className={cardInnerClass}>
                  {body}
                </Link>
              ) : (
                <div className={`${cardInnerClass} cursor-default`}>{body}</div>
              )}
            </div>
          );
        })}
      </div>

      {hasMore ? (
        <div className="mt-8 flex justify-center" style={{ overflowAnchor: "none" }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-xl border-2 border-blue bg-white px-8 py-3 text-sm font-bold text-blue transition-colors hover:bg-blueUltraLight disabled:opacity-60"
          >
            {loading ? "Загрузка..." : "Показать ещё"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
