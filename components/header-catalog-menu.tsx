"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { catalogMegaMenuIconSrc } from "@/lib/catalog-mega-menu-icons";
import type { CatalogNavFilterSource } from "@/lib/catalog-url";
import { catalogCategoryPath, catalogRootPath } from "@/lib/catalog-url";
import type { StoreBusinessTypeTileDTO } from "@/lib/store-business-type";

export type CatalogNavRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  count: number;
};

type CatalogMenuStoreRow = {
  name: string;
  slug: string;
  businessTypes: string[];
};

type CatalogCtx = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const CatalogMenuContext = createContext<CatalogCtx | null>(null);

function useCatalogMenu() {
  const ctx = useContext(CatalogMenuContext);
  if (!ctx) throw new Error("Catalog menu context missing");
  return ctx;
}

function formatCount(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function formatStoreCountRu(n: number): string {
  const f = formatCount(n);
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return `${f} магазинов`;
  if (d === 1) return `${f} магазин`;
  if (d >= 2 && d <= 4) return `${f} магазина`;
  return `${f} магазинов`;
}

type ProviderProps = {
  categories: CatalogNavRow[];
  childCategories: CatalogNavRow[];
  storeBusinessTiles: StoreBusinessTypeTileDTO[];
  stores: CatalogMenuStoreRow[];
  children: ReactNode;
};

type ContentProps = ProviderProps & {
  /** Сохранение min/max/sort при переходе из страниц `/catalog`. */
  catalogNav?: CatalogNavFilterSource;
};

function HeaderCatalogMenuContent({
  categories,
  childCategories,
  storeBusinessTiles,
  stores,
  children,
  catalogNav,
}: ContentProps) {
  const [open, setOpen] = useState(false);
  const [topTab, setTopTab] = useState<"products" | "stores">("products");
  const [activeRootIndex, setActiveRootIndex] = useState(0);
  const [activeStoreTypeIndex, setActiveStoreTypeIndex] = useState(0);

  const childrenByParent = useMemo(() => {
    const m = new Map<string, CatalogNavRow[]>();
    for (const c of childCategories) {
      if (!c.parentId) continue;
      const arr = m.get(c.parentId) ?? [];
      arr.push(c);
      m.set(c.parentId, arr);
    }
    for (const arr of Array.from(m.values())) {
      arr.sort((a: CatalogNavRow, b: CatalogNavRow) =>
        a.name.localeCompare(b.name, "ru"),
      );
    }
    return m;
  }, [childCategories]);

  const activeRoot = categories[activeRootIndex] ?? null;
  const activeChildren = activeRoot ? (childrenByParent.get(activeRoot.id) ?? []) : [];
  const activeStoreTile = storeBusinessTiles[activeStoreTypeIndex] ?? null;
  const storesByType = useMemo(() => {
    const m = new Map<string, CatalogMenuStoreRow[]>();
    for (const s of stores) {
      const uniqTypes = new Set(s.businessTypes);
      for (const t of Array.from(uniqTypes)) {
        const arr = m.get(t) ?? [];
        arr.push(s);
        m.set(t, arr);
      }
    }
    for (const arr of Array.from(m.values())) {
      arr.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    }
    return m;
  }, [stores]);
  const activeTypeStores = activeStoreTile
    ? (storesByType.get(activeStoreTile.value) ?? [])
    : [];

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (categories.length && activeRootIndex >= categories.length) {
      setActiveRootIndex(0);
    }
  }, [categories.length, activeRootIndex]);

  useEffect(() => {
    if (
      storeBusinessTiles.length &&
      activeStoreTypeIndex >= storeBusinessTiles.length
    ) {
      setActiveStoreTypeIndex(0);
    }
  }, [storeBusinessTiles.length, activeStoreTypeIndex]);

  useEffect(() => {
    const h = document.getElementById("site-header");
    if (!h) return;
    if (open) h.classList.add("catalog-header-open");
    else h.classList.remove("catalog-header-open");
    return () => h.classList.remove("catalog-header-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    return () => document.body.classList.remove("overflow-hidden");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const title =
    topTab === "products" ? "Каталог товаров" : "Каталог магазинов";

  return (
    <CatalogMenuContext.Provider value={{ open, toggle, close }}>
      {children}
      <div
        id="catalog-mega-panel"
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-labelledby="catalog-mega-title"
        className={`fixed inset-0 z-[80] overflow-auto bg-white transition-[opacity,visibility] duration-300 lg:inset-x-0 lg:bottom-0 lg:left-0 lg:right-0 lg:top-[76px] lg:h-[calc(100dvh-76px)] ${
          open ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1385px] flex-col gap-[15px] px-[15px] pb-10 pt-4 md:pt-6">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <span className="text-sm font-semibold text-blueNavy">Меню</span>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blueExtraLight text-blueNavy"
              aria-label="Закрыть каталог"
              onClick={close}
            >
              <Image src="/mlavka/img/close-blue.svg" alt="" width={20} height={20} />
            </button>
          </div>

          <div className="flex flex-col-reverse items-start gap-[11px] md:flex-row md:items-center md:gap-[22px]">
            <h2
              id="catalog-mega-title"
              className="text-base font-extrabold text-[#052850] md:text-[22px]"
            >
              {title}
            </h2>
            <div className="w-full shadow-lg shadow-[#34588226] md:w-auto md:shadow-none">
              <div className="flex w-full rounded-md border border-blueExtraLight bg-white p-[2px] md:w-auto">
                <button
                  type="button"
                  className={`flex h-9 w-1/2 items-center justify-center gap-2 rounded-tl-[5px] rounded-bl-[5px] px-4 text-xs font-medium md:w-auto md:justify-start ${
                    topTab === "products"
                      ? "bg-blue text-white"
                      : "text-blueSteel"
                  }`}
                  onClick={() => setTopTab("products")}
                >
                  Товары
                </button>
                <button
                  type="button"
                  className={`flex h-9 w-1/2 items-center justify-center gap-2 rounded-tr-[5px] rounded-br-[5px] px-4 text-xs font-medium md:w-auto md:justify-start ${
                    topTab === "stores"
                      ? "bg-blue text-white"
                      : "text-blueSteel"
                  }`}
                  onClick={() => setTopTab("stores")}
                >
                  Магазины
                </button>
              </div>
            </div>
          </div>

          {topTab === "products" ? (
            <div className="flex flex-col gap-6 border-t border-blueExtraLight lg:flex-row lg:items-start lg:gap-[50px]">
              {categories.length === 0 ? (
                <p className="pt-6 text-sm text-blueSteel">
                  Категории появятся после маппинга и импорта товаров.{" "}
                  <Link
                    href="/catalog"
                    className="font-medium text-blue underline-offset-2 hover:underline"
                    onClick={close}
                  >
                    Открыть каталог
                  </Link>
                </p>
              ) : (
                <>
                  <div className="flex w-full flex-col border-blueExtraLight lg:w-[400px] lg:border-r lg:pr-[22px] lg:pt-[27px]">
                    {categories.map((cat, i) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-md p-2.5 text-left text-sm font-medium text-blueNavy transition-colors hover:bg-blueExtraLight ${
                          i === activeRootIndex
                            ? "bg-blueExtraLight font-semibold text-blue"
                            : ""
                        }`}
                        onMouseEnter={() => setActiveRootIndex(i)}
                        onFocus={() => setActiveRootIndex(i)}
                        onClick={() => setActiveRootIndex(i)}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
                          <Image
                            src={catalogMegaMenuIconSrc(i, cat.name)}
                            alt=""
                            width={24}
                            height={24}
                            className="max-h-6 max-w-6 object-contain opacity-90"
                            unoptimized
                          />
                        </span>
                        <span className="min-w-0">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 lg:pt-[34px]">
                    {activeRoot ? (
                      <>
                        <div className="mb-5 flex flex-wrap items-baseline gap-[15px]">
                          <span className="text-xl font-extrabold text-blueNavy md:text-[22px]">
                            {activeRoot.name}
                          </span>
                          <span className="text-xs font-normal text-blueNavy">
                            {formatCount(activeRoot.count)} товаров
                          </span>
                        </div>
                        <Link
                          href={catalogCategoryPath(activeRoot.slug, undefined, catalogNav)}
                          className="mb-4 inline-block text-sm font-semibold text-blue hover:underline"
                          onClick={close}
                        >
                          Все товары в категории
                        </Link>
                        {activeChildren.length > 0 ? (
                          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-2">
                            {activeChildren.map((ch) => (
                              <li key={ch.id}>
                                <Link
                                  href={catalogCategoryPath(ch.slug, undefined, catalogNav)}
                                  className="text-sm text-blueNavy transition-colors hover:text-blue"
                                  onClick={close}
                                >
                                  {ch.name}
                                  <span className="ml-1 text-xs text-blueSteel">
                                    ({formatCount(ch.count)})
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 border-t border-blueExtraLight lg:flex-row lg:items-start lg:gap-[50px]">
              {storeBusinessTiles.length === 0 ? (
                <p className="pt-6 text-sm text-blueSteel">
                  Магазинов с витриной в каталоге пока нет.{" "}
                  <Link
                    href="/stores"
                    className="font-medium text-blue underline-offset-2 hover:underline"
                    onClick={close}
                  >
                    Каталог магазинов
                  </Link>
                </p>
              ) : (
                <>
                  <div className="flex w-full flex-col border-blueExtraLight lg:w-[400px] lg:border-r lg:pr-[22px] lg:pt-[27px]">
                    {storeBusinessTiles.map((tile, i) => (
                      <button
                        key={tile.value}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-md p-2.5 text-left text-sm font-medium text-blueNavy transition-colors hover:bg-blueExtraLight ${
                          i === activeStoreTypeIndex
                            ? "bg-blueExtraLight font-semibold text-blue"
                            : ""
                        }`}
                        onMouseEnter={() => setActiveStoreTypeIndex(i)}
                        onFocus={() => setActiveStoreTypeIndex(i)}
                        onClick={() => setActiveStoreTypeIndex(i)}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden>
                          <Image
                            src={catalogMegaMenuIconSrc(i)}
                            alt=""
                            width={24}
                            height={24}
                            className="max-h-6 max-w-6 object-contain opacity-90"
                            unoptimized
                          />
                        </span>
                        <span className="min-w-0">{tile.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 lg:pt-[34px]">
                    {activeStoreTile ? (
                      <>
                        <div className="mb-5 flex flex-wrap items-baseline gap-[15px]">
                          <span className="text-xl font-extrabold text-blueNavy md:text-[22px]">
                            {activeStoreTile.label}
                          </span>
                          <span className="text-xs font-normal text-blueNavy">
                            {formatStoreCountRu(activeStoreTile.count)}
                          </span>
                        </div>
                        <Link
                          href={catalogRootPath(undefined, {
                            ...catalogNav,
                            businessTypes: [activeStoreTile.value],
                          })}
                          className="mb-4 inline-block text-sm font-semibold text-blue hover:underline"
                          onClick={close}
                        >
                          Все магазины этого типа
                        </Link>
                        {activeTypeStores.length > 0 ? (
                          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-2">
                            {activeTypeStores.map((store) => (
                              <li key={store.slug}>
                                <Link
                                  href={`/stores/${encodeURIComponent(store.slug)}`}
                                  className="text-sm text-blueNavy transition-colors hover:text-blue"
                                  onClick={close}
                                >
                                  {store.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-blueSteel">
                            Для этого типа пока нет доступных магазинов.
                          </p>
                        )}
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </CatalogMenuContext.Provider>
  );
}

function HeaderCatalogMenuWithUrlFilters(props: ProviderProps) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const catalogNav = useMemo((): CatalogNavFilterSource | undefined => {
    if (!pathname?.startsWith("/catalog")) return undefined;
    const o: CatalogNavFilterSource = {};
    const minPrice = sp.get("minPrice");
    const maxPrice = sp.get("maxPrice");
    const sort = sp.get("sort");
    if (minPrice) o.minPrice = minPrice;
    if (maxPrice) o.maxPrice = maxPrice;
    if (sort) o.sort = sort;
    return o;
  }, [pathname, sp]);

  return <HeaderCatalogMenuContent {...props} catalogNav={catalogNav} />;
}

export function HeaderCatalogMenuProvider(props: ProviderProps) {
  return (
    <Suspense
      fallback={<HeaderCatalogMenuContent {...props} catalogNav={undefined} />}
    >
      <HeaderCatalogMenuWithUrlFilters {...props} />
    </Suspense>
  );
}

export function HeaderCatalogMenuMobileTrigger() {
  const { open, toggle } = useCatalogMenu();
  return (
    <button
      type="button"
      className={`rounded-[10px] bg-blue px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blueDark lg:hidden ${open ? "ring-2 ring-blueExtraLight" : ""}`}
      aria-expanded={open}
      aria-controls="catalog-mega-panel"
      onClick={toggle}
    >
      Каталог
    </button>
  );
}

export function HeaderCatalogMenuDesktopTrigger() {
  const { open, toggle } = useCatalogMenu();
  return (
    <button
      type="button"
      className={`flex h-12 w-32 shrink-0 items-center justify-center gap-[13px] rounded-[10px] bg-blue px-[14px] text-sm font-semibold text-white transition-colors hover:bg-blueDark`}
      aria-expanded={open}
      aria-controls="catalog-mega-panel"
      onClick={toggle}
    >
      <Image
        src="/mlavka/img/catalog-icon.svg"
        alt=""
        width={20}
        height={20}
        className={`shrink-0 ${open ? "hidden" : ""}`}
        aria-hidden
      />
      <Image
        src="/mlavka/img/close2.svg"
        alt=""
        width={20}
        height={20}
        className={`shrink-0 ${open ? "" : "hidden"}`}
        aria-hidden
      />
      Каталог
    </button>
  );
}
