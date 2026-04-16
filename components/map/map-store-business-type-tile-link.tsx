import Link from "next/link";
import type { StoreBusinessType } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { CatalogCategoryTileImage } from "@/components/catalog-category-tile-image";
import { getCatalogCategoryTileVisual } from "@/lib/catalog-category-tiles";
import type { CatalogNavFilterSource } from "@/lib/catalog-url";
import { catalogRootPath } from "@/lib/catalog-url";

type Props = {
  value: StoreBusinessType;
  label: string;
  count: number;
  styleIndex: number;
  /** Сохранить min/max/sort и т.д. при переходе из `/catalog`. */
  catalogNav?: CatalogNavFilterSource;
  onNavigate?: () => void;
};

/** Плитка типа магазина в том же виде, что карточка рубрики каталога. */
export function MapStoreBusinessTypeTileLink({
  value,
  label,
  count,
  styleIndex,
  catalogNav,
  onNavigate,
}: Props) {
  const v = getCatalogCategoryTileVisual(1, label, styleIndex);
  const searchParams = useSearchParams();
  const mapParams = new URLSearchParams();
  mapParams.set("tab", "stores");
  mapParams.set("types", String(value));
  const lat = (searchParams.get("lat") ?? "").trim();
  const lng = (searchParams.get("lng") ?? "").trim();
  const radiusKm = (searchParams.get("radiusKm") ?? "").trim();
  if (lat) mapParams.set("lat", lat);
  if (lng) mapParams.set("lng", lng);
  if (radiusKm) mapParams.set("radiusKm", radiusKm);
  const href = mapParams.toString()
    ? `/map/categories?${mapParams.toString()}`
    : catalogRootPath(undefined, { ...catalogNav, businessTypes: [value] });

  return (
    <Link
      prefetch={false}
      href={href}
      onClick={onNavigate}
      className={`catalog-category-card relative flex h-[120px] w-full min-w-[150px] flex-col rounded-xl rounded-br-none px-3 py-[13px] sm:h-[149px] sm:px-[18px] ${v.bgClass}`}
    >
      <h4 className="truncate text-[11px] font-semibold text-blueSteel2 md:text-[13px]">
        {label} ({count.toLocaleString("ru-RU")})
      </h4>
      <span className="text-[10px] text-blueSteel2">Перейти</span>
      <CatalogCategoryTileImage
        svgSrc={v.customIconSvgSrc}
        pngSrc={v.customIconPngSrc}
        fallbackSrc={`/mlavka/img/category-img${v.fallbackCategoryImgNum}.png`}
        className="pointer-events-none absolute bottom-0 right-0 h-[100px] w-[162px] object-contain object-bottom"
      />
    </Link>
  );
}
