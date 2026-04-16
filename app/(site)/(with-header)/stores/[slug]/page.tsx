import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogProductGrid } from "@/app/(site)/(with-header)/catalog/catalog-product-grid";
import { BackNavButton } from "@/components/back-nav-button";
import { ProductPageStoreMap } from "@/components/product-page-store-map";
import { buildCatalogProductWhere, resolveCatalogCategoryIds } from "@/lib/catalog-products-query";
import { prisma } from "@/lib/prisma";
import { formatStoreBusinessTypesHuman } from "@/lib/store-business-type";
import {
  formatWorkingHoursHuman,
  storePublicFullText,
  storePublicShortText,
} from "@/lib/store-display";

type Props = {
  params: { slug: string };
  searchParams?: { category?: string | string[] };
};

const PAGE_SIZE = 24;

/** Пустой список категорий → только товары с привязкой к marketplace-категориям. */
const NO_CATEGORY_FILTER: string[] = [];

export const dynamic = "force-dynamic";

/** Ссылка в магазин: сначала fallback_url, затем website. */
function storeShopUrl(
  fallbackUrl: string | null | undefined,
  website: string | null | undefined,
): string | null {
  const f = fallbackUrl?.trim();
  if (f) return f;
  const w = website?.trim();
  if (w) return w;
  return null;
}

function storeMetaDescription(name: string, description: string | null | undefined): string {
  const d = description?.trim();
  if (d) {
    const oneLine = d.replace(/\s+/g, " ");
    return oneLine.length <= 160 ? oneLine : `${oneLine.slice(0, 157)}…`;
  }
  return `${name}: товары, контакты и условия покупки на маркетплейсе.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug?.trim();
  if (!slug) return { title: "Магазин" };

  const store = await prisma.store.findFirst({
    where: { slug, active: true },
    select: {
      name: true,
      shortDescription: true,
      fullDescription: true,
    },
  });
  if (!store) return { title: "Магазин" };
  return {
    title: `${store.name} — магазин`,
    description: storeMetaDescription(store.name, storePublicShortText(store)),
  };
}

type SocialLink = { href: string; label: string };
type SocialIconLink = { href: string; icon: string; label: string };

const STORE_FULFILLMENT_PILL: Record<
  string,
  { iconSrc: string; iconW: number; iconH: number; label: string }
> = {
  delivery: { iconSrc: "/icon/dostavka.svg", iconW: 18, iconH: 13, label: "Доставка" },
  pickup: { iconSrc: "/icon/samoviviz.svg", iconW: 18, iconH: 17, label: "Самовывоз" },
  offline: { iconSrc: "/icon/magazin.svg", iconW: 15, iconH: 13, label: "Посещение магазина" },
};

function collectSocialLinks(store: {
  website: string | null;
  vkUrl: string | null;
  telegramUrl: string | null;
  whatsappUrl: string | null;
  otherMessengerUrl: string | null;
}): SocialLink[] {
  const out: SocialLink[] = [];
  const w = store.website?.trim();
  if (w) out.push({ href: w, label: "Сайт" });
  const vk = store.vkUrl?.trim();
  if (vk) out.push({ href: vk, label: "ВКонтакте" });
  const tg = store.telegramUrl?.trim();
  if (tg) out.push({ href: tg, label: "Telegram" });
  const wa = store.whatsappUrl?.trim();
  if (wa) out.push({ href: wa, label: "WhatsApp" });
  const o = store.otherMessengerUrl?.trim();
  if (o) out.push({ href: o, label: "Другой мессенджер" });
  return out;
}

function collectSocialIconLinks(store: {
  vkUrl: string | null;
  telegramUrl: string | null;
  whatsappUrl: string | null;
}): SocialIconLink[] {
  const out: SocialIconLink[] = [];
  const tg = store.telegramUrl?.trim();
  if (tg) out.push({ href: tg, icon: "/mlavka/img/telegram.svg", label: "Telegram" });
  const wa = store.whatsappUrl?.trim();
  if (wa) out.push({ href: wa, icon: "/mlavka/img/whatsapp.svg", label: "WhatsApp" });
  const vk = store.vkUrl?.trim();
  if (vk) out.push({ href: vk, icon: "/mlavka/img/vk.svg", label: "ВКонтакте" });
  return out;
}

export default async function StorePage({ params, searchParams }: Props) {
  const slug = params.slug?.trim();
  if (!slug) {
    notFound();
  }

  const store = await prisma.store.findFirst({
    where: { slug, active: true },
  });

  if (!store) {
    notFound();
  }

  const shopUrl = storeShopUrl(store.fallbackUrl, store.website);
  const shouldListProducts = store.showProducts;
  const storeSubcategories = await prisma.marketplaceCategory.findMany({
    where: {
      parentId: { not: null },
      mappings: {
        some: {
          sourceCategory: {
            storeId: store.id,
          },
        },
      },
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
    take: 40,
  });
  const selectedCategorySlugRaw = searchParams?.category;
  const selectedCategorySlug = Array.isArray(selectedCategorySlugRaw)
    ? selectedCategorySlugRaw[0]?.trim() || ""
    : selectedCategorySlugRaw?.trim() || "";
  const selectedCategory = selectedCategorySlug
    ? storeSubcategories.find((cat) => cat.slug === selectedCategorySlug) ?? null
    : null;
  const selectedCategoryIds = selectedCategory
    ? await resolveCatalogCategoryIds(selectedCategory.id)
    : NO_CATEGORY_FILTER;
  const where = buildCatalogProductWhere(store.slug, selectedCategoryIds);

  const [products, total] = shouldListProducts
    ? await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            images: {
              take: 1,
              select: { url: true },
            },
          },
          take: PAGE_SIZE,
          skip: 0,
          orderBy: { createdAt: "desc" },
        }),
        prisma.product.count({ where }),
      ])
    : [[], 0];

  const hasMore = shouldListProducts && PAGE_SIZE < total;

  const storeLogoForGrid = store.logo?.trim() || null;
  const initialItems = products.map((p) => {
    const s = (p.slug ?? "").trim();
    return {
      id: p.id,
      slug: s === "" ? null : s,
      storeSlug: store.slug,
      name: p.name,
      price: p.price,
      imageUrl: p.images[0]?.url ?? null,
      storeName: store.name,
      storeLogoUrl: storeLogoForGrid,
      fulfillmentModes: store.fulfillmentModes,
    };
  });

  const publicFullText = storePublicFullText(store);
  const logoUrl = store.logo?.trim();
  const businessTypesHuman = formatStoreBusinessTypesHuman(store.businessTypes);
  const workingHoursText = formatWorkingHoursHuman(store.workingHours);
  const socialLinks = collectSocialLinks(store);
  const socialIconLinks = collectSocialIconLinks(store);
  const modes = Array.from(new Set((store.fulfillmentModes as string[]).filter((m) => m !== "both")));

  return (
    <>
      <style>{`
        #site-header,
        footer.mt-auto {
          display: none !important;
        }
      `}</style>
      <div className="flex min-h-0 w-full flex-col bg-white lg:min-h-[100dvh] lg:flex-row lg:items-stretch">
      <section className="flex min-h-0 w-full min-w-0 flex-1 flex-col border-blueExtraLight lg:max-w-[50%] lg:flex-none lg:basis-1/2 lg:border-r">
        <div className="mx-auto w-full max-w-[720px] px-[15px] pb-10 pt-4 md:pb-[50px] lg:mr-0 lg:max-w-none lg:pl-4 lg:pr-6 xl:pl-6 xl:pr-8">
          <p className="m-0">
            <BackNavButton fallbackHref="/stores" />
          </p>

          <div className="mt-4 h-px w-full bg-[#B7C5D5]" aria-hidden />

          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-[60px] max-h-[60px] w-auto max-w-full shrink-0 items-center justify-start">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-[60px] w-auto max-w-full object-contain object-left"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="text-[10px] font-medium text-blueSteel">нет лого</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11px] font-normal leading-snug text-blueSteel">
                {businessTypesHuman || "Магазин"}
              </span>
              <h1 className="text-[18px] font-extrabold leading-tight text-blueNavy">{store.name}</h1>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-stretch gap-3 rounded-xl bg-[#EEF4FC] px-[25px] py-[20px]">
            <div className="relative isolate flex h-[45px] min-h-[45px] w-[185px] min-w-[185px] flex-none overflow-hidden rounded-xl rounded-br-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon/rasstoyanie.svg"
                alt=""
                width={189}
                height={45}
                className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain object-center"
              />
              <span className="relative z-[1] flex h-full w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight text-blueNavy">
                От вас ≈ ХХ км.
              </span>
            </div>
            <button
              type="button"
              className="inline-flex h-[45px] min-h-[45px] min-w-[min(100%,8rem)] flex-1 basis-0 items-center justify-center gap-2 rounded-xl rounded-br-none bg-blue px-2 text-center text-[12px] font-semibold leading-tight text-white sm:px-3 sm:whitespace-nowrap"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon/marshrut.svg" alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" />
              <span className="min-w-0">Построить маршрут</span>
            </button>
            {shopUrl ? (
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-[45px] min-h-[45px] min-w-[min(100%,8rem)] flex-1 basis-0 items-center justify-center gap-2 rounded-xl rounded-br-none bg-green px-2 text-center text-[12px] font-semibold leading-tight text-white sm:px-3 sm:whitespace-nowrap"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mlavka/img/shop-icon-white.png"
                  alt=""
                  width={18}
                  height={18}
                  className="h-[18px] w-[18px] shrink-0"
                />
                <span className="min-w-0">Перейти на сайт</span>
              </a>
            ) : null}
          </div>

          {modes.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-blueNavy">Формат работы</h3>
              <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                {modes.map((mode) => {
                  const meta = STORE_FULFILLMENT_PILL[mode];
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
          ) : null}

          {publicFullText ? (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-blueNavy">О магазине</h3>
              <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-blueNavy">
                {publicFullText}
              </div>
            </div>
          ) : null}

          {store.workDescription?.trim() ? (
            <div className="mt-5">
              <h3 className="text-sm font-extrabold text-blueNavy">Как работает магазин</h3>
              <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-blueNavy">
                {store.workDescription.trim()}
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-extrabold text-blueNavy">Контакты</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {socialIconLinks.map((l) => (
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
              {store.phone?.trim() ? (
                <a
                  href={`tel:${store.phone.trim().replace(/\s/g, "")}`}
                  className="ms-1 text-[22px] font-medium text-blueNavy"
                >
                  {store.phone.trim()}
                </a>
              ) : null}
            </div>
            {socialLinks.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1.5">
                {socialLinks.map((l) => (
                  <li key={`${l.label}-${l.href}`}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-semibold text-blue underline-offset-2 hover:underline"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {workingHoursText || store.address?.trim() ? (
            <div className="mt-4">
              <h3 className="text-sm font-extrabold text-blueNavy">Адрес и режим работы</h3>
              <div className="mt-2 flex flex-col gap-2 text-[13px] text-blueNavy">
                {workingHoursText ? (
                  <p className="inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon/store-work-mode.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
                    <span>{workingHoursText}</span>
                  </p>
                ) : null}
                {store.address?.trim() ? (
                  <p className="inline-flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon/store-address-map.svg" alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
                    <span>{store.address.trim()}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {storeSubcategories.length > 0 ? (
            <div className="mt-7">
              <h3 className="mb-3 text-sm font-extrabold text-blueNavy">Подкатегории магазина</h3>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/stores/${encodeURIComponent(store.slug)}`}
                  className={`inline-flex w-auto max-w-full items-center rounded-[3px] border px-3 py-2 text-[12px] font-normal transition-colors ${
                    selectedCategory
                      ? "border-blueExtraLight bg-white text-blueNavy hover:border-blue hover:text-blue"
                      : "border-blue bg-blue text-white hover:bg-[#0057BE]"
                  }`}
                  prefetch={false}
                >
                  Все категории
                </Link>
                {storeSubcategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/stores/${encodeURIComponent(store.slug)}?category=${encodeURIComponent(cat.slug)}`}
                    className={`inline-flex w-auto max-w-full items-center rounded-[3px] border px-3 py-2 text-[12px] font-normal transition-colors ${
                      selectedCategory?.slug === cat.slug
                        ? "border-blue bg-blue text-white hover:bg-[#0057BE]"
                        : "border-blueExtraLight bg-white text-blueNavy hover:border-blue hover:text-blue"
                    }`}
                    prefetch={false}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <section aria-label="Товары магазина" className="mt-7">
            <h3 className="mb-3 text-sm font-extrabold text-blueNavy">Товары</h3>
            {shouldListProducts ? (
              <CatalogProductGrid
                key={`${store.slug}:${selectedCategory?.slug ?? "all"}`}
                initialItems={initialItems}
                initialHasMore={hasMore}
                category={selectedCategory?.slug}
                store={store.slug}
                gridClassName="grid grid-cols-3 gap-[15px] gap-y-[12px] items-stretch"
              />
            ) : (
              <p className="text-sm text-blueSteel">Витрина товаров для этого магазина временно скрыта.</p>
            )}
          </section>
        </div>
      </section>

      <div className="flex w-full min-w-0 flex-1 flex-col lg:max-w-[50%] lg:flex-none lg:basis-1/2">
        <ProductPageStoreMap
          storeName={store.name}
          storeSlug={store.slug}
          storeLogoUrl={store.logo?.trim() || null}
          latitude={store.latitude}
          longitude={store.longitude}
        />
      </div>
      </div>
    </>
  );
}
