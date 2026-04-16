import Link from "next/link";
import type { Product, ProductImage, Store } from "@prisma/client";
import { CatalogProductGrid } from "@/app/(site)/(with-header)/catalog/catalog-product-grid";
import type { CatalogProductItem } from "@/app/(site)/(with-header)/catalog/catalog-product-grid";
import { BackNavButton } from "@/components/back-nav-button";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPageStoreMap } from "@/components/product-page-store-map";
import { RouteToStoreLink } from "@/components/route-to-store-link";

export type ProductPageViewModel = Product & {
  images: ProductImage[];
  store: Store;
};

const priceFmt = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function productPriceMainAndSuffix(value: number): { main: string; small: string } {
  const nf = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  let main = "";
  let small = "";
  let afterDecimal = false;
  for (const { type, value: v } of nf.formatToParts(value)) {
    if (type === "decimal") {
      afterDecimal = true;
      small += v;
    } else if (type === "fraction") {
      small += v;
    } else if (afterDecimal) {
      small += v;
    } else {
      main += v;
    }
  }
  return { main: main.trimEnd(), small: small.trimStart() };
}

function uniqFulfillmentModes(modes: string[]): string[] {
  return Array.from(new Set(modes.filter((m) => m !== "both")));
}

const PRODUCT_FULFILLMENT_PILL: Record<
  string,
  { iconSrc: string; iconW: number; iconH: number; label: string }
> = {
  delivery: { iconSrc: "/icon/dostavka.svg", iconW: 18, iconH: 13, label: "Заказать доставку" },
  pickup: { iconSrc: "/icon/samoviviz.svg", iconW: 18, iconH: 17, label: "Оформить самовывоз" },
  offline: { iconSrc: "/icon/magazin.svg", iconW: 15, iconH: 13, label: "Купить при посещении магазина" },
};

function resolveShopHref(
  externalUrl: string | null | undefined,
  fallbackUrl: string | null | undefined,
  website: string | null | undefined,
): string | null {
  const a = externalUrl?.trim();
  if (a) return a;
  const b = fallbackUrl?.trim();
  if (b) return b;
  const c = website?.trim();
  if (c) return c;
  return null;
}

function metaDescriptionFromProduct(
  name: string,
  price: number,
  availability: boolean,
  description: string | null,
): string {
  const priceStr = priceFmt.format(price);
  const stock = availability ? "В наличии" : "Нет в наличии";
  const base = `${name}. Цена ${priceStr}. ${stock}.`;
  const extra = description?.trim();
  if (!extra) return base;
  const snippet = extra.replace(/\s+/g, " ").slice(0, 120);
  return `${base} ${snippet}${extra.length > 120 ? "…" : ""}`;
}

export { metaDescriptionFromProduct };

type Props = {
  product: ProductPageViewModel;
  relatedItems: CatalogProductItem[];
  distanceKmPlaceholder?: string;
};

export function ProductPageView({
  product,
  relatedItems,
  distanceKmPlaceholder = "ХХ",
}: Props) {
  const shopHref = resolveShopHref(
    product.externalUrl,
    product.store.fallbackUrl,
    product.store.website,
  );

  const imageUrls = product.images.map((im) => im.url);
  const modes = uniqFulfillmentModes(product.store.fulfillmentModes as string[]);

  const socialLinks = [
    product.store.telegramUrl?.trim()
      ? { href: product.store.telegramUrl.trim(), icon: "/mlavka/img/telegram.svg", label: "Telegram" }
      : null,
    product.store.whatsappUrl?.trim()
      ? { href: product.store.whatsappUrl.trim(), icon: "/mlavka/img/whatsapp.svg", label: "WhatsApp" }
      : null,
    product.store.vkUrl?.trim()
      ? { href: product.store.vkUrl.trim(), icon: "/mlavka/img/vk.svg", label: "ВКонтакте" }
      : null,
  ].filter(Boolean) as { href: string; icon: string; label: string }[];

  const priceParts = productPriceMainAndSuffix(product.price);

  return (
    <div className="flex min-h-0 w-full flex-col bg-white lg:min-h-[100dvh] lg:flex-row lg:items-stretch">
      <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col border-blueExtraLight lg:max-w-[50%] lg:flex-none lg:basis-1/2 lg:border-r">
        <div className="mx-auto w-full max-w-[720px] px-[15px] pb-10 pt-4 md:pb-[50px] lg:mr-0 lg:max-w-none lg:pl-4 lg:pr-6 xl:pl-6 xl:pr-8">
          <p className="m-0">
            <BackNavButton fallbackHref="/catalog" />
          </p>

          <div className="mt-4 h-px w-full bg-[#B7C5D5]" aria-hidden />

          <h1 className="mt-4 text-[18px] font-extrabold leading-tight text-blueNavy">{product.name}</h1>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:gap-4">
            <div className="w-full min-w-0 shrink-0 md:max-w-[410px] md:flex-[0_1_410px]">
              <ProductGallery images={imageUrls} productName={product.name} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-baseline gap-0 pt-1 leading-none text-blueNavy">
                <span className="text-[22px] font-black">{priceParts.main}</span>
                <span className="text-[15px] font-medium tabular-nums">{priceParts.small}</span>
              </div>
              <div className="flex flex-col gap-2 pt-0.5">
                <span className="text-[12px] font-bold leading-none text-[#052850]">Продавец</span>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 max-h-[32px] w-[109px] max-w-[109px] shrink-0 items-center justify-start">
                    {product.store.logo?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element -- логотип магазина с произвольного URL
                      <img
                        src={product.store.logo.trim()}
                        alt=""
                        className="max-h-[32px] max-w-[109px] w-auto object-contain object-left"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-[10px] font-medium text-blueSteel">нет лого</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[11px] font-normal leading-snug text-blueSteel">Тип магазина</span>
                    <Link
                      href={`/stores/${product.store.slug}`}
                      prefetch={false}
                      className="text-[13px] font-medium leading-snug text-[#0075FF] hover:underline"
                    >
                      {product.store.name}
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                {modes.map((mode) => {
                  const meta = PRODUCT_FULFILLMENT_PILL[mode];
                  if (!meta) return null;
                  return (
                    <span
                      key={mode}
                      className="inline-flex h-[45px] w-fit shrink-0 items-center gap-2.5 rounded-full rounded-br-none bg-[#F3F8FF] px-3 pe-4 text-[11px] font-semibold text-blueNavy"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={meta.iconSrc}
                        alt=""
                        width={meta.iconW}
                        height={meta.iconH}
                        className="h-[18px] w-auto max-w-[18px] shrink-0 object-contain"
                      />
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-stretch gap-3 rounded-xl bg-[#EEF4FC] px-2.5 py-[20px]">
            <div className="relative isolate flex h-[45px] min-h-[45px] min-w-[min(100%,9rem)] flex-1 basis-0 overflow-hidden rounded-xl rounded-br-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon/rasstoyanie.svg"
                alt=""
                width={189}
                height={45}
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain object-center"
              />
              <span className="relative z-[1] flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight text-blueNavy">
                От вас ≈ {distanceKmPlaceholder} км.
              </span>
            </div>
            <RouteToStoreLink
              storeLatitude={product.store.latitude}
              storeLongitude={product.store.longitude}
              storeAddress={product.store.address}
              storeName={product.store.name}
              className="inline-flex h-[45px] min-h-[45px] min-w-[min(100%,9rem)] flex-1 basis-0 items-center justify-center gap-2 rounded-xl rounded-br-none bg-blue px-2 text-center text-[12px] font-semibold leading-tight text-white sm:px-3 sm:whitespace-nowrap"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon/marshrut.svg"
                alt=""
                width={18}
                height={18}
                className="h-[18px] w-[18px] shrink-0"
              />
              <span className="min-w-0">Построить маршрут</span>
            </RouteToStoreLink>
            {shopHref ? (
              <a
                href={shopHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[45px] min-h-[45px] min-w-[min(100%,9rem)] flex-1 basis-0 items-center justify-center gap-2 rounded-xl rounded-br-none bg-green px-2 text-center text-[12px] font-semibold leading-tight text-white sm:px-3 sm:whitespace-nowrap"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mlavka/img/shop-icon-white.png"
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] shrink-0"
                />
                <span className="min-w-0">Купить в магазине</span>
              </a>
            ) : null}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-extrabold text-blueNavy">О товаре</h3>
            <div className="mt-2 text-[13px] leading-relaxed text-blueNavy">
              {product.description?.trim() ? (
                <div className="whitespace-pre-wrap">{product.description.trim()}</div>
              ) : (
                <p className="text-blueSteel">Описание не указано.</p>
              )}
            </div>
          </div>

          {product.store.shortDescription?.trim() ? (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-blueNavy">Краткое описание магазина</h3>
              <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-blueNavy">
                {product.store.shortDescription.trim()}
              </div>
            </div>
          ) : null}

          {product.store.fullDescription?.trim() ? (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-blueNavy">Полное описание магазина</h3>
              <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-blueNavy">
                {product.store.fullDescription.trim()}
              </div>
            </div>
          ) : null}

          {product.store.workDescription?.trim() ? (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-blueNavy">Как работает магазин</h3>
              <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-blueNavy">
                {product.store.workDescription.trim()}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-extrabold text-blueNavy">Контакты</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {socialLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[18px] rounded-br-none bg-blueUltraLight"
                  title={l.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.icon} alt="" width={16} height={16} className="h-4 w-4" />
                </a>
              ))}
              {product.store.phone?.trim() ? (
                <a
                  href={`tel:${product.store.phone.trim().replace(/\s/g, "")}`}
                  className="ms-1 text-[22px] font-medium text-blueNavy"
                >
                  {product.store.phone.trim()}
                </a>
              ) : null}
            </div>
          </div>

          {product.store.workingHours || product.store.address ? (
            <div className="mt-4">
              <h3 className="text-sm font-extrabold text-blueNavy">Адрес и режим работы</h3>
              <div className="mt-2 flex flex-col gap-2 text-[13px] text-blueNavy">
                {product.store.workingHours ? (
                  <p className="inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon/store-work-mode.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
                    <span>{String(product.store.workingHours)}</span>
                  </p>
                ) : null}
                {product.store.address?.trim() ? (
                  <p className="inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon/store-address-map.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
                    <span>{product.store.address.trim()}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {relatedItems.length > 0 ? (
            <div className="mt-7">
              <h3 className="mb-3 text-sm font-extrabold text-blueNavy">Похожие предложения</h3>
              <CatalogProductGrid
                initialItems={relatedItems}
                initialHasMore={false}
                gridClassName="grid grid-cols-3 gap-[15px] gap-y-[12px] items-stretch"
              />
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex w-full min-w-0 flex-1 flex-col lg:max-w-[50%] lg:flex-none lg:basis-1/2">
        <ProductPageStoreMap
          storeName={product.store.name}
          storeSlug={product.store.slug}
          storeLogoUrl={product.store.logo?.trim() || null}
          latitude={product.store.latitude}
          longitude={product.store.longitude}
        />
      </div>
    </div>
  );
}
