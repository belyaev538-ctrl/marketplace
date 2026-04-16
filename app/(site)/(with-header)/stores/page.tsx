import { StoreBusinessType } from "@prisma/client";
import { cookies } from "next/headers";
import { CatalogBreadcrumb } from "@/components/catalog-breadcrumb";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CatalogCategoryCardLink } from "@/components/catalog-category-card-link";
import { RouteToStoreLink } from "@/components/route-to-store-link";
import { StoreDistanceBadge } from "@/components/store-distance-badge";
import { catalogListableStoreWhere } from "@/lib/catalog-products-query";
import { firstSearchParam, manySearchParams } from "@/lib/search-params";
import { STORE_BUSINESS_TYPE_OPTIONS } from "@/lib/store-business-type";
import { prisma } from "@/lib/prisma";
import { CatalogSearchBar } from "@/app/(site)/(with-header)/catalog/catalog-search-bar";
import { CatalogCategoryCardsCollapsible } from "@/app/(site)/(with-header)/catalog/catalog-category-cards-collapsible";
import { CatalogGeoSync } from "@/app/(site)/(with-header)/catalog/catalog-geo-sync";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getStoreIdsInCatalogGeoRadius,
  parseCatalogGeoRadiusFromSearchParams,
} from "@/lib/catalog-geo-radius";
import {
  USER_LOCATION_LAT_COOKIE_KEY,
  USER_LOCATION_LNG_COOKIE_KEY,
} from "@/lib/user-location";
import { SEARCH_RADIUS_COOKIE_KEY } from "@/lib/search-radius-preference";
import "@/app/(site)/(with-header)/catalog/catalog.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: {
    q?: string | string[];
    fulfillment?: string | string[];
    businessTypes?: string | string[];
    types?: string | string[];
    lat?: string | string[];
    lng?: string | string[];
    radiusKm?: string | string[];
    showAllTypes?: string | string[];
  };
};

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

function storesListQueryHref(args: {
  q?: string;
  fulfillment?: string[];
  businessTypes?: string[];
  types?: string[];
  lat?: string;
  lng?: string;
  radiusKm?: string;
}) {
  const sp = new URLSearchParams();
  if (args.q?.trim()) sp.set("q", args.q.trim());
  for (const f of args.fulfillment ?? []) {
    const v = f.trim();
    if (v) sp.append("fulfillment", v);
  }
  const mergedTypes = [...(args.businessTypes ?? []), ...(args.types ?? [])];
  const normalizedTypes = Array.from(new Set(mergedTypes.map((x) => x.trim()).filter(Boolean)));
  if (normalizedTypes.length > 0) {
    sp.set("types", normalizedTypes.join(","));
  }
  if (args.lat?.trim()) sp.set("lat", args.lat.trim());
  if (args.lng?.trim()) sp.set("lng", args.lng.trim());
  if (args.radiusKm?.trim()) sp.set("radiusKm", args.radiusKm.trim());
  const q = sp.toString();
  return q ? `/stores?${q}` : "/stores";
}

export default async function StoresPage({ searchParams }: Props) {
  const q = firstSearchParam(searchParams.q)?.trim() ?? "";
  const normalizedQ = q.toLowerCase();
  const cookieStore = await cookies();
  const latRaw =
    firstSearchParam(searchParams.lat) ??
    cookieStore.get(USER_LOCATION_LAT_COOKIE_KEY)?.value ??
    undefined;
  const lngRaw =
    firstSearchParam(searchParams.lng) ??
    cookieStore.get(USER_LOCATION_LNG_COOKIE_KEY)?.value ??
    undefined;
  const radiusKmRaw =
    firstSearchParam(searchParams.radiusKm) ??
    cookieStore.get(SEARCH_RADIUS_COOKIE_KEY)?.value ??
    undefined;
  const showAllTypes = firstSearchParam(searchParams.showAllTypes) === "1";
  const geo = parseCatalogGeoRadiusFromSearchParams({
    lat: latRaw,
    lng: lngRaw,
    radiusKm: radiusKmRaw,
  });
  const storeIdsInRadius = geo ? await getStoreIdsInCatalogGeoRadius(geo) : null;
  const selectedFulfillment = manySearchParams(searchParams.fulfillment)
    .map((x) => x.trim())
    .filter((x) => x === "delivery" || x === "pickup" || x === "offline");
  const legacyBusinessTypes = manySearchParams(searchParams.businessTypes).map((x) => x.trim());
  const typesCsv = firstSearchParam(searchParams.types)
    ?.split(",")
    .map((x) => x.trim()) ?? [];
  const selectedBusinessTypesRaw = Array.from(
    new Set([...legacyBusinessTypes, ...typesCsv].filter(Boolean)),
  );
  const selectedBusinessTypesForFilter = showAllTypes ? [] : selectedBusinessTypesRaw;
  const selectedBusinessTypesSet = new Set(selectedBusinessTypesForFilter);
  const resetFiltersHref = storesListQueryHref({
    q: q || undefined,
    types: selectedBusinessTypesRaw,
    lat: latRaw,
    lng: lngRaw,
    radiusKm: radiusKmRaw,
  });

  // Канонизируем URL фильтров магазинов для SEO: /stores?types=a,b,c
  if (legacyBusinessTypes.length > 0) {
    const canonicalHref = storesListQueryHref({
      q,
      fulfillment: selectedFulfillment,
      types: selectedBusinessTypesRaw,
      lat: latRaw,
      lng: lngRaw,
      radiusKm: radiusKmRaw,
    });
    redirect(canonicalHref);
  }

  const validBusinessTypes = new Set<string>(Object.values(StoreBusinessType));
  const businessTypesFromQuery = STORE_BUSINESS_TYPE_OPTIONS.filter(({ label, value }) => {
    const labelMatch = label.toLowerCase().includes(normalizedQ);
    const valueNormalized = typeof value === "string" ? value.toLowerCase() : "";
    const valueMatch = valueNormalized.includes(normalizedQ);
    return normalizedQ !== "" && (labelMatch || valueMatch);
  })
    .map((x) => x.value)
    .filter((value): value is StoreBusinessType => typeof value === "string" && validBusinessTypes.has(value));

  const stores = await prisma.store.findMany({
    where: {
      ...catalogListableStoreWhere([]),
      ...(storeIdsInRadius ? { id: { in: storeIdsInRadius } } : {}),
      ...(normalizedQ
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              ...(businessTypesFromQuery.length > 0
                ? [{ businessTypes: { hasSome: businessTypesFromQuery } }]
                : []),
            ],
          }
        : {}),
      ...(selectedFulfillment.length > 0
        ? {
            fulfillmentModes: {
              hasSome: selectedFulfillment,
            },
          }
        : {}),
      ...(selectedBusinessTypesForFilter.length > 0
        ? {
            businessTypes: {
              hasSome: selectedBusinessTypesForFilter.filter(
                (value): value is StoreBusinessType => validBusinessTypes.has(value),
              ),
            },
          }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      logo: true,
      businessTypes: true,
      fulfillmentModes: true,
      workDescription: true,
      phone: true,
      address: true,
      latitude: true,
      longitude: true,
      vkUrl: true,
      telegramUrl: true,
      whatsappUrl: true,
      otherMessengerUrl: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows =
    normalizedQ === ""
      ? await prisma.store.findMany({
          where: {
            ...catalogListableStoreWhere([]),
            ...(storeIdsInRadius ? { id: { in: storeIdsInRadius } } : {}),
          },
          select: { businessTypes: true },
        })
      : stores.map((s) => ({ businessTypes: s.businessTypes }));

  const counts = new Map<StoreBusinessType, number>();
  for (const r of rows) {
    const uniq = new Set(r.businessTypes as StoreBusinessType[]);
    for (const t of Array.from(uniq)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  const cards = STORE_BUSINESS_TYPE_OPTIONS
    .map((opt) => ({ type: opt.value, label: opt.label, count: counts.get(opt.value) ?? 0 }))
    .filter((x) => x.count > 0);

  const inUseBusinessTypeOptions = STORE_BUSINESS_TYPE_OPTIONS.filter(
    (opt) => counts.get(opt.value) != null || selectedBusinessTypesSet.has(String(opt.value)),
  );
  const isStoresListMode =
    normalizedQ !== "" || selectedBusinessTypesRaw.length > 0 || selectedFulfillment.length > 0 || showAllTypes;

  return (
    <div className="min-h-full bg-white pb-10">
      <CatalogSearchBar showOnMapHref="/map/categories?tab=stores" mode="stores" />
      <CatalogGeoSync />
      {isStoresListMode ? (
        <main className="mx-auto w-full max-w-[1385px] px-[15px] pt-[18px] pb-[30px] md:pb-[50px]">
          <CatalogBreadcrumb items={[{ label: "Магазины", href: null }]} />
          <h1 className="text-base font-extrabold text-blueNavy md:text-[22px]">
            {q ? `Результаты поиска магазинов: "${q}"` : "Каталог магазинов"}
          </h1>
          <div className="mt-5 flex w-full flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-[25px]">
            <aside className="filter_wrap hidden min-w-[205px] max-w-[205px] shrink-0 flex-col lg:flex">
              <form
                key={`f:${selectedFulfillment.join(",")}|t:${selectedBusinessTypesRaw.join(",")}|q:${q}|lat:${latRaw ?? ""}|lng:${lngRaw ?? ""}|r:${radiusKmRaw ?? ""}`}
                className="flex flex-col"
                action="/stores"
                method="get"
              >
                {q ? <input type="hidden" name="q" value={q} /> : null}
                {latRaw ? <input type="hidden" name="lat" value={latRaw} /> : null}
                {lngRaw ? <input type="hidden" name="lng" value={lngRaw} /> : null}
                {radiusKmRaw ? <input type="hidden" name="radiusKm" value={radiusKmRaw} /> : null}

                <div className="flex flex-col gap-3">
                  {(["delivery", "pickup", "offline"] as const).map((mode) => (
                    <label key={mode} className="inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        name="fulfillment"
                        value={mode}
                        defaultChecked={selectedFulfillment.includes(mode)}
                      />
                      <div className="relative h-[17px] w-[34px] shrink-0 rounded-full border border-blue bg-white shadow-none after:absolute after:start-[2px] after:top-0.5 after:h-[11px] after:w-[11px] after:rounded-full after:border after:border-blue after:bg-blue after:transition-all after:content-[''] peer-checked:border-green peer-checked:bg-green peer-checked:after:translate-x-[150%] peer-checked:after:border-green peer-checked:after:bg-white rtl:peer-checked:after:-translate-x-full" />
                      <span className="ms-2.5 text-xs font-medium text-blueNavy">
                        {mode === "delivery" ? "Доставка" : mode === "pickup" ? "Самовывоз" : "Посещение"}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <b className="text-[13px] font-bold text-blueNavy">Тип магазина</b>
                  <div className="flex flex-col gap-2">
                    {inUseBusinessTypeOptions.map((opt) => (
                      <label key={opt.value} className="inline-flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          name="businessTypes"
                          value={opt.value}
                          defaultChecked={selectedBusinessTypesSet.has(String(opt.value))}
                          className="h-4 w-4 shrink-0 rounded border border-blue text-blue focus:ring-blue"
                        />
                        <span className="text-xs font-medium text-blueNavy">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex w-full flex-col gap-2.5">
                  <button
                    type="submit"
                    className="w-full rounded-md bg-blue py-[11px] text-[13px] font-bold text-white transition-colors hover:opacity-95"
                  >
                    Применить
                  </button>
                  <Link
                    href={resetFiltersHref}
                    scroll={false}
                    prefetch={false}
                    className="inline-flex w-full items-center justify-center rounded-md border border-blueExtraLight bg-white py-[11px] text-center text-[13px] font-semibold text-blueNavy transition-colors hover:border-blue hover:text-blue"
                  >
                    Сбросить
                  </Link>
                </div>
              </form>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="mb-4 hidden items-center justify-between border-b border-graySoft pb-[15px] lg:flex">
                <span className="text-[13px] font-medium text-blueNavy">
                  Найдено магазинов {stores.length.toLocaleString("ru-RU")}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {stores.map((store) => {
                  const telegramHref = store.telegramUrl
                    ? normalizeTelegramHref(store.telegramUrl)
                    : null;
                  const whatsappHref = store.whatsappUrl
                    ? normalizeWhatsAppHref(store.whatsappUrl)
                    : null;
                  const businessTypeLabel =
                    store.businessTypes.length > 0
                      ? store.businessTypes
                          .map(
                            (value) =>
                              STORE_BUSINESS_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ??
                              String(value),
                          )
                          .join(", ")
                      : "Магазин";
                  return (
                    <article
                      key={store.id}
                    className="rounded-xl border border-blueExtraLight bg-white p-[30px] shadow-[0px_10px_34px_0px_#5f7e4426]"
                    >
                    <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5">
                      <div className="min-w-0 flex flex-1 flex-col gap-[10px]">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-[55px] w-[190px] items-center justify-center rounded-md ${
                              store.logo?.trim() ? "bg-white" : "bg-[#F3F8FF]"
                            }`}
                          >
                            {store.logo?.trim() ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={store.logo.trim()}
                                alt=""
                                className="h-[55px] w-auto max-w-[180px] object-contain"
                              />
                            ) : (
                              <span className="text-[10px] font-medium text-blueSteel">нет логотипа</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-[#3E6897]">
                              {businessTypeLabel}
                            </p>
                            <h3 className="truncate text-base font-extrabold text-[#032339]">
                              {store.name}
                            </h3>
                          </div>
                        </div>
                        <p className="text-[12px] font-normal text-blueNavy">
                          Товаров: <span className="font-semibold">{store._count.products}</span>
                        </p>
                        {store.workDescription?.trim() ? (
                          <p className="text-[12px] font-normal text-[#052850]">
                            Режим работы:{" "}
                            <span className="font-semibold">{store.workDescription.trim()}</span>
                          </p>
                        ) : null}
                        {store.address?.trim() ? (
                          <p className="text-[12px] font-normal text-blueSteel">
                            Адрес: <span className="font-semibold text-[#052850]">{store.address.trim()}</span>
                          </p>
                        ) : null}
                        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                          {store.fulfillmentModes.map((m) => {
                            const iconPath =
                              m === "delivery"
                                ? "/mlavka/img/card-icon1.svg"
                                : m === "pickup"
                                  ? "/mlavka/img/card-icon2.svg"
                                  : "/mlavka/img/card-icon3.svg";
                            return (
                              <span
                                key={`${store.id}-${m}`}
                                className="inline-flex h-[45px] w-fit shrink-0 items-center gap-2.5 rounded-full rounded-br-none bg-[#F3F8FF] px-3 pe-4 text-[11px] font-semibold text-blueNavy"
                              >
                                <span
                                  aria-hidden
                                  className="h-4 w-4 shrink-0 bg-[#0075FF]"
                                  style={{
                                    WebkitMaskImage: `url(${iconPath})`,
                                    maskImage: `url(${iconPath})`,
                                    WebkitMaskRepeat: "no-repeat",
                                    maskRepeat: "no-repeat",
                                    WebkitMaskPosition: "center",
                                    maskPosition: "center",
                                    WebkitMaskSize: "contain",
                                    maskSize: "contain",
                                  }}
                                />
                                {m === "delivery"
                                  ? "Доставка"
                                  : m === "pickup"
                                    ? "Самовывоз"
                                    : m === "offline"
                                      ? "Посещение магазина"
                                      : m}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="md:w-px md:shrink-0 md:self-stretch md:bg-[#e3e9f1]" />
                      <div className="flex shrink-0 flex-col justify-end gap-2 md:min-w-[352px]">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {telegramHref ? (
                            <a
                              href={telegramHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]"
                              aria-label="Telegram"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/icon/telegram-store.svg"
                                alt=""
                                width={40}
                                height={40}
                                className="h-10 w-10"
                              />
                            </a>
                          ) : null}
                          {store.vkUrl?.trim() ? (
                            <a
                              href={store.vkUrl.trim()}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]"
                              aria-label="VK"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/icon/vk-store.svg" alt="" width={40} height={40} className="h-10 w-10" />
                            </a>
                          ) : null}
                          {whatsappHref ? (
                            <a
                              href={whatsappHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]"
                              aria-label="WhatsApp"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/icon/whatsapp-store.svg"
                                alt=""
                                width={40}
                                height={40}
                                className="h-10 w-10"
                              />
                            </a>
                          ) : null}
                          {store.otherMessengerUrl?.trim() ? (
                            <a
                              href={store.otherMessengerUrl.trim()}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blueUltraLight transition-colors hover:bg-[#d9e9ff]"
                              aria-label="MAX"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/icon/max-store.svg" alt="" width={40} height={40} className="h-10 w-10" />
                            </a>
                          ) : null}
                          {store.phone?.trim() ? (
                            <a
                              href={`tel:${store.phone.trim().replace(/\s/g, "")}`}
                              className="inline-flex items-center gap-2 text-[16px] font-medium text-[#032339]"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/icon/phone-store.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
                              {store.phone.trim()}
                            </a>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <StoreDistanceBadge
                            storeLatitude={store.latitude}
                            storeLongitude={store.longitude}
                            className="relative isolate flex h-[45px] min-h-[45px] w-[185px] min-w-[185px] flex-none overflow-hidden rounded-xl rounded-br-none"
                          />
                          <RouteToStoreLink
                            storeLatitude={store.latitude}
                            storeLongitude={store.longitude}
                            storeAddress={store.address}
                            storeName={store.name}
                            className="inline-flex h-[45px] min-h-[45px] w-[177px] items-center justify-center gap-2 whitespace-nowrap rounded-xl rounded-br-none border border-blue bg-white px-3 text-center text-[12px] font-semibold leading-tight text-blue transition-colors hover:bg-blueUltraLight"
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
                        <div className="grid grid-cols-1 gap-2 md:mt-[15px] md:grid-cols-2">
                          <Link
                            href={`/stores/${encodeURIComponent(store.slug)}`}
                            prefetch={false}
                            className="inline-flex h-[45px] min-h-[45px] min-w-[min(100%,9rem)] flex-1 basis-0 items-center justify-center gap-2 rounded-xl rounded-br-none bg-blue px-2 text-center text-[12px] font-semibold leading-tight text-white transition-colors hover:bg-[#0057BE] sm:px-3 sm:whitespace-nowrap"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/mlavka/img/map-cart.svg" alt="" width={16} height={16} className="h-4 w-4 shrink-0" />
                            Показать на карте
                          </Link>
                          <Link
                            href={`/stores/${encodeURIComponent(store.slug)}`}
                            prefetch={false}
                            className="inline-flex h-[45px] min-h-[45px] items-center justify-center gap-2 rounded-xl rounded-br-none bg-green px-3 text-center text-[12px] font-semibold leading-tight text-white transition-colors hover:opacity-95"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/mlavka/img/shop-icon-white.png" alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" />
                            Посмотреть товары
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                  );
                })}
                {stores.length === 0 ? (
                  <EmptyState className="py-8" />
                ) : null}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <section className="categories pt-[18px] pb-[30px] md:pb-[50px]" aria-labelledby="stores-catalog-heading">
          <div className="mx-auto w-full max-w-[1385px] px-[15px]">
            <CatalogBreadcrumb items={[{ label: "Магазины", href: null }]} />
            <div className="flex flex-col gap-2.5 md:gap-[26px]">
              <div className="flex items-center justify-between gap-4">
                <h1 id="stores-catalog-heading" className="text-base font-extrabold text-blueNavy md:text-[22px]">
                  {q ? `Результаты поиска магазинов: "${q}"` : "Каталог магазинов"}
                </h1>
                <Link
                  href={`/stores?${(() => {
                    const sp = new URLSearchParams();
                    sp.set("types", "grocery");
                    sp.set("showAllTypes", "1");
                    if (latRaw?.trim()) sp.set("lat", latRaw.trim());
                    if (lngRaw?.trim()) sp.set("lng", lngRaw.trim());
                    if (radiusKmRaw?.trim()) sp.set("radiusKm", radiusKmRaw.trim());
                    return sp.toString();
                  })()}`}
                  prefetch={false}
                  className="shrink-0 text-[12px] font-medium text-blue transition-colors hover:text-[#0057BE]"
                >
                  Показать все
                </Link>
              </div>
              {q ? (
                <p className="text-[13px] font-medium text-blueSteel">
                  Найдено магазинов: {stores.length.toLocaleString("ru-RU")}
                </p>
              ) : null}
              {q && stores.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 md:grid-cols-3">
                  {stores.map((store) => (
                    <Link
                      key={store.slug}
                      href={`/catalog?store=${encodeURIComponent(store.slug)}`}
                      className="rounded-xl border border-blueExtraLight bg-white px-4 py-3 text-sm font-semibold text-blueNavy transition-colors hover:border-blue hover:text-blue"
                    >
                      {store.name}
                    </Link>
                  ))}
                </div>
              ) : null}
              {q && stores.length === 0 ? (
                <EmptyState className="py-8" />
              ) : null}
              {cards.length > 0 ? (
                <CatalogCategoryCardsCollapsible>
                  {cards.map((card, index) => (
                    <CatalogCategoryCardLink
                      key={card.type}
                      href={storesListQueryHref({
                        q,
                        businessTypes: [String(card.type)],
                        lat: latRaw,
                        lng: lngRaw,
                        radiusKm: radiusKmRaw,
                      })}
                      name={card.label}
                      count={card.count}
                      styleIndex={index}
                    />
                  ))}
                </CatalogCategoryCardsCollapsible>
              ) : (
                <EmptyState className="py-8" />
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
