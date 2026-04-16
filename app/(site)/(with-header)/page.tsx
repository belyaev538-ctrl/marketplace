import Image from "next/image";
import type { Metadata } from "next";
import { CatalogCategoryCardLink } from "@/components/catalog-category-card-link";
import { HomeBannerSlider } from "@/components/home-banner-slider";
import { HomeHeroSearch, HomeMapCard } from "@/components/home-hero-search";
import { getHomeBannersForHomePage } from "@/lib/home-banners";
import { catalogCategoryPath } from "@/lib/catalog-url";
import { getHomeMarketplaceCategoriesWithCounts } from "@/lib/marketplace-catalog-categories";
import { CatalogCategoryCardsCollapsible } from "./catalog/catalog-category-cards-collapsible";
import "./catalog/catalog.css";
import "../mlavka-home.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Маркетплейс — товары от магазинов вашего района",
    description:
      "Каталог товаров от локальных магазинов: доставка, самовывоз и покупки на месте. Найдите категорию и оформите заказ у продавцов рядом с вами.",
  };
}

export default async function HomePage() {
  // Только корневые категории; подрубрики — на странице категории в каталоге.
  const [categories, bannerSlides] = await Promise.all([
    getHomeMarketplaceCategoriesWithCounts(),
    getHomeBannersForHomePage(),
  ]);

  return (
    <div className="overflow-hidden bg-white">
      <section className="ml-home pt-[22px] md:pt-[51px] pb-[33px] md:pb-[44.83px]">
        <div className="mx-auto w-full max-w-[1385px] px-[15px]">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-[25px] mb-[45px]">
            <div className="flex flex-col gap-[34px] md:gap-[74px] w-full">
              <div className="flex flex-col gap-[11px] md:gap-1 max-w-[780px]">
                <h1 className="text-lg max-w-[270px] md:max-w-full leading-[123%] md:leading-normal md:text-[32px] text-white font-black">
                  Магазины рядом — быстро и без наценок
                </h1>
                <p className="text-[13px] md:text-base text-white leading-[140%] md:leading-[127%]">
                  Найди нужный товар в своём городе — сравни реальные цены, выбери магазин, где можно сразу
                  купить на месте или удобно заказать онлайн. Без переплат, напрямую от продавцов.
                </p>
              </div>

              <HomeHeroSearch />
            </div>

            <HomeMapCard />
          </div>

          <div className="ml-boxs-scroll boxs grid grid-cols-2 lg:flex items-start justify-between gap-x-1 gap-y-4 md:gap-5 flex-wrap">
            <div className="flex items-center gap-[7px] md:gap-[18px]">
              <div className="min-w-[35px] md:min-w-[50px] min-h-[35px] md:min-h-[50px] rounded-md md:rounded-[10px] bg-[#0254B454] md:bg-[#0254B48C] flex items-center justify-center">
                <Image
                  src="/mlavka/img/box_icon1.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="w-[15px] md:w-auto"
                />
              </div>
              <p className="text-[11px] md:text-[13px] whitespace-nowrap text-white font-medium">
                Цены без наценки <br /> маркетплейсов
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-[7px] md:gap-[18px]">
              <div className="min-w-[35px] md:min-w-[50px] min-h-[35px] md:min-h-[50px] rounded-md md:rounded-[10px] bg-[#0254B454] md:bg-[#0254B48C] flex items-center justify-center">
                <Image
                  src="/mlavka/img/box_icon2.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="w-[15px] md:w-auto"
                />
              </div>
              <p className="text-[11px] md:text-[13px] whitespace-nowrap text-white font-medium">
                Покупай в своём городе, <br /> быстро и без переплат
              </p>
            </div>
            <div className="flex items-center gap-[7px] md:gap-[18px]">
              <div className="min-w-[35px] md:min-w-[50px] min-h-[35px] md:min-h-[50px] rounded-md md:rounded-[10px] bg-[#0254B454] md:bg-[#0254B48C] flex items-center justify-center">
                <Image
                  src="/mlavka/img/box_icon3.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="w-[15px] md:w-auto"
                />
              </div>
              <p className="text-[11px] md:text-[13px] whitespace-nowrap text-white font-medium">
                Посети магазин или <br /> закажи доставку
              </p>
            </div>
            <div className="flex items-center gap-[7px] md:gap-[18px]">
              <div className="min-w-[35px] md:min-w-[50px] min-h-[35px] md:min-h-[50px] rounded-md md:rounded-[10px] bg-[#0254B454] md:bg-[#0254B48C] flex items-center justify-center">
                <Image
                  src="/mlavka/img/box_icon4.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="w-[15px] md:w-auto"
                />
              </div>
              <p className="text-[11px] md:text-[13px] whitespace-nowrap text-white font-medium">
                Реальные магазины <br /> рядом с тобой
              </p>
            </div>
            <div className="flex items-center gap-[7px] md:gap-[18px]">
              <div className="min-w-[35px] md:min-w-[50px] min-h-[35px] md:min-h-[50px] rounded-md md:rounded-[10px] bg-[#0254B454] md:bg-[#0254B48C] flex items-center justify-center">
                <Image
                  src="/mlavka/img/box_icon5.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="w-[15px] md:w-auto"
                />
              </div>
              <p className="text-[11px] md:text-[13px] whitespace-nowrap text-white font-medium">
                Прямой контакт <br /> с продавцом
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="categories pt-[18px] pb-[30px] md:pb-[50px]"
        aria-labelledby="home-categories-heading"
      >
        <div className="mx-auto w-full max-w-[1385px] px-[15px]">
          <div className="flex flex-col gap-2.5 md:gap-[26px]">
            <h2
              id="home-categories-heading"
              className="text-base font-extrabold text-blueNavy md:text-[22px]"
            >
              Товары по категориям
            </h2>

            <CatalogCategoryCardsCollapsible>
              {categories.map((cat, index) => (
                <CatalogCategoryCardLink
                  key={cat.id}
                  href={catalogCategoryPath(cat.slug)}
                  name={cat.name}
                  count={cat.count}
                  styleIndex={index}
                />
              ))}
            </CatalogCategoryCardsCollapsible>
          </div>
        </div>
      </section>

      {bannerSlides.length > 0 ? <HomeBannerSlider slides={bannerSlides} /> : null}
    </div>
  );
}
