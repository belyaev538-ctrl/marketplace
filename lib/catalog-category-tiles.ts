import { slugifyMarketplaceCategoryName } from "@/lib/marketplace-category-slug";

/**
 * Плитки рубрик каталога: фон + путь к своей иконке.
 *
 * Иконки уровня 1 кладите в:
 *   `public/catalog/categories/l1/{slugify(название)}.svg` или тот же ключ с `.png`
 * где slugify — как у URL категории из `slugifyMarketplaceCategoryName` (транслит с названия в БД).
 *
 * В папке дизайна можно именовать файлы для удобства, например:
 *   `l1-ohota-i-rybalka-CFE4F3.svg` → скопировать в public как `ohota-i-rybalka.svg`
 *
 * Уровень 2: пути l2 остаются в `getCatalogCategoryTileVisual` для фона; на витрине плитки L2 без картинки (`CatalogCategoryCardLink` level={2}).
 */

export const CATEGORY_TILE_FALLBACK_BACKGROUNDS = [
  "bg-[#CFE4F3]",
  "bg-[#FFF2DF]",
  "bg-[#FFEAD1]",
  "bg-[#ECEBEA]",
  "bg-[#FFF8D6]",
  "bg-[#F1FFDD]",
  "bg-[#FFE5EB]",
  "bg-[#D0D0D0]",
  "bg-[#D5F2FF]",
  "bg-[#FFEDD8]",
  "bg-[#EBFFD2]",
  "bg-[#F4EDFF]",
  "bg-[#E9F6D4]",
  "bg-[#FAFFDF]",
  "bg-[#CCEAFF]",
  "bg-[#FDE0CA]",
  "bg-[#DCECFF]",
  "bg-[#FFE6E4]",
] as const;

/** Родительские рубрики из `prisma/seed.ts` (порядок → цвет, пока не заданы отдельные hex в макете). */
const L1_CATEGORY_NAMES_FROM_SEED = [
  "Продукты питания",
  "Напитки",
  "Товары для дома",
  "Хозяйственные товары",
  "Строительство и ремонт",
  "Автотовары",
  "Одежда и обувь",
  "Электроника и техника",
  "Красота и здоровье",
  "Детские товары",
  "Зоотовары",
  "Мебель",
  "Спорт и отдых",
  "Сад и огород",
  "Канцтовары и офис",
  "Подарки и сувениры",
  "Книги",
  "Ювелирные изделия и часы",
  "Охота и рыбалка",
  "Музыка и творчество",
] as const;

/**
 * Явные фоны по ключу slugify (перекрывают цвет из порядка списка выше).
 * Пример: `ohota-i-rybalka: "bg-[#CFE4F3]"`.
 */
export const CATALOG_L1_BACKGROUND_OVERRIDES: Record<string, string> = {
  /** «Продукты питания» + иконка `public/catalog/categories/l1/produkty-pitaniya.png` */
  "produkty-pitaniya": "bg-[#FFFEAC]",
};

/** Ключ = slugifyMarketplaceCategoryName(name) → фон плитки. */
export const CATALOG_L1_TILE_BG_BY_KEY: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  const bgs = CATEGORY_TILE_FALLBACK_BACKGROUNDS;
  for (let i = 0; i < L1_CATEGORY_NAMES_FROM_SEED.length; i++) {
    const name = L1_CATEGORY_NAMES_FROM_SEED[i];
    const key = slugifyMarketplaceCategoryName(name);
    out[key] = bgs[i % bgs.length];
  }
  for (const [k, v] of Object.entries(CATALOG_L1_BACKGROUND_OVERRIDES)) {
    if (v?.trim()) out[k] = v.trim();
  }
  return out;
})();

export type CatalogCategoryTileLevel = 1 | 2;

export type CatalogCategoryTileVisual = {
  bgClass: string;
  /** Клиент грузит .png → .svg → заглушка `category-img` (см. `CatalogCategoryTileImage`). */
  customIconSvgSrc: string;
  customIconPngSrc: string;
  fallbackCategoryImgNum: number;
};

export function getCatalogCategoryTileVisual(
  level: CatalogCategoryTileLevel,
  name: string,
  styleIndex: number,
): CatalogCategoryTileVisual {
  const key = slugifyMarketplaceCategoryName(name);
  const mod = CATEGORY_TILE_FALLBACK_BACKGROUNDS.length;
  const fallbackNum = (styleIndex % 18) + 1;

  if (level === 1) {
    const svgPublicPath = `/catalog/categories/l1/${key}.svg`;
    const pngPublicPath = `/catalog/categories/l1/${key}.png`;
    const bg =
      CATALOG_L1_TILE_BG_BY_KEY[key] ??
      CATEGORY_TILE_FALLBACK_BACKGROUNDS[styleIndex % mod];
    return {
      bgClass: bg,
      customIconSvgSrc: svgPublicPath,
      customIconPngSrc: pngPublicPath,
      fallbackCategoryImgNum: fallbackNum,
    };
  }

  return {
    bgClass: CATEGORY_TILE_FALLBACK_BACKGROUNDS[styleIndex % mod],
    customIconSvgSrc: `/catalog/categories/l2/${key}.svg`,
    customIconPngSrc: `/catalog/categories/l2/${key}.png`,
    fallbackCategoryImgNum: fallbackNum,
  };
}
