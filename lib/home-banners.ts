import { prisma } from "@/lib/prisma";

export type HomeBannerSlide = {
  title: string;
  subtitle: string | null;
  image: string;
  linkUrl: string | null;
};

/** Подзаголовок как в reference-layout/index.html (секция .banner). */
export const REFERENCE_LAYOUT_BANNER_SUBTITLE =
  "Закажите доставку овощей и фруктов на сумму более 1500 рублей и получите скидку до 30%. Смотрите акционные товары у нас на сайте или уточняйте у продавца в магазине";

/**
 * Слайды слайдера главной — как в верстке reference-layout (4 слайда, чередование img1 / img2).
 * Пути к картинкам — публичные, как в Next (`/mlavka/img/...`).
 */
export const REFERENCE_LAYOUT_HOME_BANNER_SLIDES: HomeBannerSlide[] = [
  {
    title: "Скидки на овощи и фрукты до 30%",
    subtitle: REFERENCE_LAYOUT_BANNER_SUBTITLE,
    image: "/mlavka/img/banner-img1.png",
    linkUrl: null,
  },
  {
    title: "Место под размещения баннера",
    subtitle: REFERENCE_LAYOUT_BANNER_SUBTITLE,
    image: "/mlavka/img/banner-img2.png",
    linkUrl: null,
  },
  {
    title: "Скидки на овощи и фрукты до 30%",
    subtitle: REFERENCE_LAYOUT_BANNER_SUBTITLE,
    image: "/mlavka/img/banner-img1.png",
    linkUrl: null,
  },
  {
    title: "Место под размещения баннера",
    subtitle: REFERENCE_LAYOUT_BANNER_SUBTITLE,
    image: "/mlavka/img/banner-img2.png",
    linkUrl: null,
  },
];

/** Fallback, если таблица HomeBanner пуста (до сида / без БД). */
export const FALLBACK_HOME_BANNER_SLIDES: HomeBannerSlide[] =
  REFERENCE_LAYOUT_HOME_BANNER_SLIDES;

function mapRow(r: {
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
}): HomeBannerSlide {
  return {
    title: r.title,
    subtitle: r.subtitle,
    image: r.imageUrl,
    linkUrl: r.linkUrl,
  };
}

/**
 * Слайды для главной: активные из БД по sortOrder.
 * Если записей нет — те же слайды, что в reference-layout (статический fallback).
 * Если записи есть, но все выключены — пустой массив (блок не показываем).
 */
export async function getHomeBannersForHomePage(): Promise<HomeBannerSlide[]> {
  const all = await prisma.homeBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      active: true,
      title: true,
      subtitle: true,
      imageUrl: true,
      linkUrl: true,
    },
  });

  const activeRows = all.filter((r) => r.active);
  if (activeRows.length > 0) {
    return activeRows.map((r) =>
      mapRow({
        title: r.title,
        subtitle: r.subtitle,
        imageUrl: r.imageUrl,
        linkUrl: r.linkUrl,
      }),
    );
  }
  if (all.length === 0) {
    return FALLBACK_HOME_BANNER_SLIDES;
  }
  return [];
}
