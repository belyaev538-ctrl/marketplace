"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent, type Ref } from "react";
import { ProductSearchSuggestions } from "@/components/product-search-suggestions";
import { useProductSearchSuggest } from "@/hooks/use-product-search-suggest";
import { getSearchRadiusKm } from "@/lib/search-radius-preference";
import { getUserLocation } from "@/lib/user-location";

export type HeroSearchTab = "products" | "stores";

/** Внешний вид обёртки формы: карточка на главной, под вкладками, или без рамки (панель карты). */
export type HeroSearchFormAppearance = "standalone" | "below-tabs" | "map";

type Suggest = ReturnType<typeof useProductSearchSuggest>;

function HomeStoresTabIcon() {
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

function formAppearanceClass(appearance: HeroSearchFormAppearance): string {
  switch (appearance) {
    case "below-tabs":
      return "relative w-full rounded-md rounded-tl-none md:rounded-xl md:rounded-tl-none px-3 py-[15px] md:p-5 bg-white flex flex-col";
    case "map":
      return "relative w-full flex flex-col";
    case "standalone":
    default:
      return "relative w-full rounded-md md:rounded-xl px-3 py-[15px] md:p-5 bg-white flex flex-col shadow-sm ring-1 ring-blueExtraLight/60";
  }
}

function HeroSearchFormInner({
  tab,
  router,
  formAppearance,
  submitPath,
  wrapRef,
  q,
  setQuery,
  debounced,
  open,
  loading,
  hits,
  closeSuggestions,
  onFocusInput,
}: {
  tab: HeroSearchTab;
  router: ReturnType<typeof useRouter>;
  formAppearance: HeroSearchFormAppearance;
  submitPath?: string;
  wrapRef?: Ref<HTMLDivElement>;
} & Pick<
  Suggest,
  "q" | "setQuery" | "debounced" | "open" | "loading" | "hits" | "closeSuggestions" | "onFocusInput"
>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const showQueryChip = q.trim() !== "" && !isInputFocused;

  function focusSearchInput() {
    setIsInputFocused(true);
    inputRef.current?.focus();
  }

  function buildStoresHref(query: string): string {
    const params = new URLSearchParams();
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    const loc = getUserLocation();
    if (loc) {
      params.set("lat", String(loc.lat));
      params.set("lng", String(loc.lng));
      params.set("radiusKm", String(getSearchRadiusKm()));
    }
    const s = params.toString();
    return s ? `/stores?${s}` : "/stores";
  }

  function buildMapStoresHref(query: string): string {
    const params = new URLSearchParams();
    params.set("tab", "stores");
    const trimmed = query.trim();
    if (trimmed) params.set("q", trimmed);
    const loc = getUserLocation();
    if (loc) {
      params.set("lat", String(loc.lat));
      params.set("lng", String(loc.lng));
      params.set("radiusKm", String(getSearchRadiusKm()));
    }
    return `/map/categories?${params.toString()}`;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    closeSuggestions();
    if (tab === "stores") {
      if (submitPath === "/map/categories") {
        router.push(buildMapStoresHref(q));
        return;
      }
      router.push(buildStoresHref(q));
      return;
    }
    const trimmed = q.trim();
    if (!trimmed) {
      router.push(submitPath ?? "/catalog");
      return;
    }
    if (submitPath === "/map/categories") {
      const params = new URLSearchParams();
      params.set("q", trimmed);
      const loc = getUserLocation();
      if (loc) {
        params.set("lat", String(loc.lat));
        params.set("lng", String(loc.lng));
        params.set("radiusKm", String(getSearchRadiusKm()));
      }
      router.push(`/map/categories?${params.toString()}`);
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const isTyping = q.trim() !== debounced;
  const showSuggestions = tab === "products" && open && Boolean(debounced) && !isTyping;

  const inner = (
    <form onSubmit={onSubmit} className={formAppearanceClass(formAppearance)}>
      <div className="relative z-10 w-full">
        <div
          className={`search-wrap flex items-center h-[42px] md:h-14 border border-blueExtraLight transition-all duration-200 bg-blueUltraLight ${
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
                    <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </div>
          ) : (
            <input
              ref={inputRef}
              name="q"
              value={q}
              onChange={(e) => setQuery(e.target.value)}
              onInput={(e) => setQuery(e.currentTarget.value)}
              onFocus={() => {
                setIsInputFocused(true);
                onFocusInput();
              }}
              onBlur={() => setIsInputFocused(false)}
              type="search"
              autoComplete="off"
              placeholder={
                tab === "stores"
                  ? "Введите название магазина или тип магазина..."
                  : "Напишите, что вы ищете! Мы подскажем где купить..."
              }
              className="w-full min-w-0 flex-1 text-xs md:text-sm rounded-md md:rounded-xl bg-blueUltraLight text-blueNavy placeholder:text-blueSteel placeholder:text-xs md:placeholder:text-sm placeholder:font-medium font-medium px-[11px] py-[13px] md:px-4 md:py-2 outline-none"
              aria-label={tab === "stores" ? "Поиск магазинов" : "Поиск товаров"}
            />
          )}
          <div className="flex shrink-0 items-center">
            <button
              type="submit"
              aria-label="Найти"
              className="flex h-[42px] w-[80px] shrink-0 items-center justify-center rounded-br-md rounded-tr-md bg-green text-white transition-colors hover:bg-[#318D05] md:h-14 md:w-[80px] md:rounded-br-xl md:rounded-tr-xl"
            >
              <Image src="/mlavka/img/search-icon.svg" alt="" width={20} height={20} />
            </button>
          </div>
        </div>
        {showSuggestions ? (
          <div
            className={`absolute left-0 right-0 top-full max-h-[min(70vh,320px)] overflow-auto rounded-b-md border border-t-0 border-blueExtraLight bg-white shadow-md md:rounded-b-xl ${
              formAppearance === "map" ? "z-40" : "z-20"
            }`}
          >
            <ProductSearchSuggestions loading={loading} hits={hits} onPick={closeSuggestions} />
          </div>
        ) : null}
      </div>
    </form>
  );

  if (wrapRef) {
    return (
      <div ref={wrapRef} className="flex w-full flex-col wrapSearch">
        {inner}
      </div>
    );
  }
  return inner;
}

/**
 * Поле поиска как на главной (без переключателя «Товары / Магазины»).
 * Ширина — 100% контейнера (например панель карты).
 * `variant="map"` — без внешней карточки, строка поиска на всю ширину блока с заголовком.
 */
export function HomeHeroSearchForm({
  tab,
  variant = "default",
}: {
  tab: HeroSearchTab;
  variant?: "default" | "map";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suggest = useProductSearchSuggest({
    suggestEnabled: tab === "products",
    initialQuery: variant === "map" ? (searchParams.get("q") ?? "") : "",
  });
  const { wrapRef, ...suggestFields } = suggest;

  return (
    <HeroSearchFormInner
      tab={tab}
      router={router}
      formAppearance={variant === "map" ? "map" : "standalone"}
      submitPath={variant === "map" ? "/map/categories" : undefined}
      wrapRef={wrapRef}
      {...suggestFields}
    />
  );
}

export function HomeHeroSearch() {
  const [tab, setTab] = useState<HeroSearchTab>("products");
  const router = useRouter();
  const suggest = useProductSearchSuggest({ suggestEnabled: tab === "products" });

  return (
    <div ref={suggest.wrapRef} className="flex flex-col wrapSearch">
      <div className="flex gap-[1.34px] md:gap-1">
        <button
          type="button"
          onClick={() => setTab("products")}
          className={`text-xs md:text-sm font-medium flex items-center justify-center min-w-[113px] md:w-[180px] h-[42px] md:h-14 rounded-tl-md md:rounded-tl-xl gap-1.5 md:gap-2 ${
            tab === "products"
              ? "ml-home-tab-active bg-white text-blue"
              : "bg-[#064895] text-white"
          }`}
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 19 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M9.73926 0.834961C9.85406 0.834961 9.96754 0.861921 10.0703 0.913086L18.2334 4.98633C18.3567 5.04783 18.4606 5.14263 18.5332 5.25977C18.6058 5.37697 18.6444 5.5125 18.6445 5.65039V13.7959L18.6367 13.8994C18.6225 14.0012 18.5876 14.0995 18.5332 14.1875C18.4607 14.3048 18.3568 14.3993 18.2334 14.4609L10.0703 18.5332L10.0713 18.5342C9.9686 18.5857 9.85509 18.612 9.74023 18.6123H9.73926C9.62437 18.6121 9.51093 18.5856 9.4082 18.5342L1.24609 14.4609C1.12267 14.3994 1.01887 14.3048 0.946289 14.1875C0.87364 14.07 0.834827 13.934 0.834961 13.7959V5.65039C0.835103 5.5125 0.873655 5.37698 0.946289 5.25977C1.01891 5.14262 1.12273 5.04781 1.24609 4.98633L9.4082 0.913086C9.51093 0.861896 9.62449 0.835016 9.73926 0.834961ZM2.31934 6.11426V13.3369L9.73926 17.04L17.1592 13.3369V6.11426L9.73926 2.40625L2.31934 6.11426Z"
              fill="white"
              stroke="#0075FF"
              strokeWidth="0.329903"
            />
            <path
              d="M17.8535 4.90527C17.951 4.89878 18.049 4.91108 18.1416 4.94238C18.2342 4.97372 18.32 5.0235 18.3936 5.08789C18.4671 5.15225 18.527 5.23078 18.5703 5.31836C18.6136 5.40595 18.64 5.50115 18.6465 5.59863C18.653 5.69615 18.6397 5.79414 18.6084 5.88672C18.5771 5.97928 18.5282 6.06513 18.4639 6.13867C18.4317 6.17538 18.3959 6.20867 18.3574 6.23828L18.2334 6.31543L10.0723 10.373C9.99522 10.4112 9.91215 10.4356 9.82715 10.4453L9.74121 10.4502C9.62653 10.4503 9.51291 10.424 9.41016 10.373L1.24902 6.31543V6.31445C1.07244 6.22685 0.937202 6.07347 0.874023 5.88672C0.810781 5.69977 0.82473 5.4953 0.912109 5.31836C0.99962 5.14137 1.1538 5.00568 1.34082 4.94238C1.52774 4.87915 1.73225 4.89313 1.90918 4.98047H1.91016L9.74121 8.86914L17.5732 4.98047C17.6608 4.9372 17.7561 4.91177 17.8535 4.90527Z"
              fill="white"
              stroke="#0075FF"
              strokeWidth="0.329903"
            />
            <path
              d="M5.41895 2.91309C5.60586 2.84985 5.81038 2.86383 5.9873 2.95117H5.98828L14.1504 7.01953L14.2568 7.08398C14.3574 7.15707 14.4387 7.25448 14.4922 7.36816C14.5635 7.51978 14.5813 7.69138 14.543 7.85449C14.5046 8.0174 14.4125 8.16276 14.2812 8.2666C14.1498 8.37047 13.9868 8.42704 13.8193 8.42676L13.6543 8.42578V8.40137C13.5978 8.38844 13.5426 8.36965 13.4902 8.34375H13.4893L5.32715 4.28613V4.28516C5.15056 4.19756 5.01533 4.04417 4.95215 3.85742C4.88891 3.67048 4.90286 3.46601 4.99023 3.28906C5.07775 3.11207 5.23193 2.97638 5.41895 2.91309Z"
              fill="white"
              stroke="#0075FF"
              strokeWidth="0.329903"
            />
            <path
              d="M9.74121 8.96582C9.93808 8.96582 10.1274 9.04439 10.2666 9.18359C10.4056 9.32273 10.4834 9.51135 10.4834 9.70801V17.8701C10.4834 18.0669 10.4058 18.2563 10.2666 18.3955C10.1274 18.5347 9.93808 18.6123 9.74121 18.6123C9.54451 18.6123 9.35594 18.5345 9.2168 18.3955C9.07759 18.2563 8.99902 18.067 8.99902 17.8701V9.70801C8.99907 9.51121 9.07763 9.32276 9.2168 9.18359C9.35596 9.04443 9.54441 8.96587 9.74121 8.96582Z"
              fill="white"
              stroke="#0075FF"
              strokeWidth="0.329903"
            />
          </svg>
          Товары
        </button>
        <button
          type="button"
          onClick={() => setTab("stores")}
          className={`ml-home-tab-stores text-xs md:text-sm font-medium flex items-center justify-center min-w-[113px] md:w-[180px] h-[42px] md:h-14 rounded-tr-md md:rounded-tr-xl gap-1.5 md:gap-2 ${
            tab === "stores"
              ? "ml-home-tab-active bg-white text-blue"
              : "bg-[#064895] text-white"
          }`}
        >
          <HomeStoresTabIcon />
          Магазины
        </button>
      </div>

      <HeroSearchFormInner
        tab={tab}
        router={router}
        formAppearance="below-tabs"
        {...suggest}
      />
    </div>
  );
}

export function HomeMapCard() {
  return (
    <div className="ml-home-card relative lg:max-w-[435px] w-full h-[176px] lg:h-[345px] rounded-xl flex flex-col gap-5 lg:gap-[38.5px] pt-[21px] lg:pt-[33px] pb-5 px-3 lg:px-5 overflow-hidden">
      <div className="flex flex-col gap-[9px] lg:gap-3.5">
        <h3 className="relative z-10 text-sm lg:text-lg text-white font-bold lg:font-black max-w-[180px] lg:max-w-60 lg:leading-[22px]">
          Смотри, где купить — на карте твоего города
        </h3>
        <p className="relative z-10 text-xs lg:text-base text-white lg:leading-[21px]">
          Найди ближайший магазин <br /> с товаром, который тебе нужен
        </p>
      </div>
      <Image
        src="/mlavka/img/shop-img.png"
        alt=""
        width={400}
        height={345}
        className="absolute right-0 top-0 h-[190px] w-auto lg:h-auto pointer-events-none select-none"
      />

      <div className="flex max-w-fit flex-row-reverse lg:flex-col items-center lg:items-start gap-3 lg:gap-[34px] relative z-10">
        <Image
          src="/mlavka/img/map-line.svg"
          alt=""
          width={188}
          height={63}
          className="ml-home-map-line-animate hidden h-10 w-28 lg:flex lg:h-[62.5px] lg:w-[188px]"
        />
        <Image
          src="/mlavka/img/map-line-mob.svg"
          alt=""
          width={200}
          height={48}
          className="ml-home-map-line-animate -mt-3 flex h-auto w-auto lg:hidden"
        />

        <Link
          href="/map/categories"
          prefetch={false}
          className="text-xs lg:text-sm text-white font-medium flex items-center bg-blue hover:bg-[#0057BE] rounded-md lg:rounded-xl gap-[7px] lg:gap-2.5 py-3 px-[13px] lg:py-[15px] lg:px-[30px] lg:w-[220px] lg:h-14 whitespace-nowrap"
        >
          <Image
            src="/mlavka/img/map-cart.svg"
            alt=""
            width={24}
            height={24}
            className="w-[17px] lg:w-auto"
          />
          Искать на карте
        </Link>
      </div>
    </div>
  );
}
