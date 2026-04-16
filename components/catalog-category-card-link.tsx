import Link from "next/link";
import { CatalogCategoryTileImage } from "@/components/catalog-category-tile-image";
import {
  getCatalogCategoryTileVisual,
  type CatalogCategoryTileLevel,
} from "@/lib/catalog-category-tiles";

type Props = {
  href: string;
  name: string;
  count: number;
  /** 1 — корень каталога (иконка справа, «Перейти»); 2 — подкатегории: 80px, текст с переносом, без «Перейти». */
  level?: CatalogCategoryTileLevel;
  /** Резервная раскраска, если имя не совпало с пресетом L1. */
  styleIndex: number;
  /** Не прокручивать страницу вверх при переходе. */
  preventScrollReset?: boolean;
};

export function CatalogCategoryCardLink({
  href,
  name,
  count,
  level = 1,
  styleIndex,
  preventScrollReset = false,
}: Props) {
  const v = getCatalogCategoryTileVisual(level, name, styleIndex);
  const showImage = level !== 2;

  return (
    <Link
      prefetch={false}
      href={href}
      scroll={!preventScrollReset}
      className={`catalog-category-card relative flex w-full min-w-[150px] flex-col rounded-xl rounded-br-none ${
        showImage
          ? "px-3 py-[13px] sm:px-[18px] h-[120px] sm:h-[149px]"
          : "h-[60px] justify-center px-[15px] py-1.5"
      } ${showImage ? v.bgClass : "bg-[#DEECFF]"}`}
    >
      {showImage ? (
        <h4 className="truncate text-[11px] font-semibold text-blueSteel2 md:text-[13px]">
          {name} ({count.toLocaleString("ru-RU")})
        </h4>
      ) : (
        <div className="w-full min-w-0 text-left">
          <h4 className="truncate text-[13px] font-semibold leading-tight text-blueSteel2 whitespace-nowrap">
            {name}
          </h4>
          <p className="mt-0.5 truncate text-[10px] font-normal leading-tight text-blueSteel">
            {count.toLocaleString("ru-RU")} товара
          </p>
        </div>
      )}
      {showImage ? (
        <span className="text-[10px] text-blueSteel2">Перейти</span>
      ) : null}
      {showImage ? (
        <CatalogCategoryTileImage
          svgSrc={v.customIconSvgSrc}
          pngSrc={v.customIconPngSrc}
          fallbackSrc={`/mlavka/img/category-img${v.fallbackCategoryImgNum}.png`}
          className="pointer-events-none absolute bottom-0 right-0 h-[100px] w-[162px] object-contain object-bottom"
        />
      ) : null}
    </Link>
  );
}
