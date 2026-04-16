"use client";

import Link from "next/link";
import { NextProductImageWithSkeleton } from "@/components/product-image-with-skeleton";
import { formatPriceRub } from "@/lib/format-price-rub";
import { productPublicPath } from "@/lib/product-url";
import type { ProductSearchHit } from "@/hooks/use-product-search-suggest";

type Props = {
  loading: boolean;
  hits: ProductSearchHit[];
  onPick?: () => void;
  className?: string;
  /** Подсветка строки (клавиатура в каталоге); без пропа — как на главной. */
  highlightIndex?: number;
  onHighlightIndexChange?: (index: number) => void;
};

export function ProductSearchSuggestions({
  loading,
  hits,
  onPick,
  className = "",
  highlightIndex,
  onHighlightIndexChange,
}: Props) {
  return (
    <div className={`py-1 ${className}`} role="listbox">
      {loading ? (
        <div className="px-3 py-2 text-xs text-blueSteel">Поиск…</div>
      ) : hits.length === 0 ? (
        <div className="px-3 py-2 text-xs text-blueSteel">Ничего не найдено</div>
      ) : (
        hits.map((h, index) => {
          const slug = h.slug?.trim();
          const href = slug ? productPublicPath(h.storeSlug, slug) : null;
          const img = h.imageUrl?.trim() || null;
          const highlighted = highlightIndex === index;

          const row = (
            <div className="flex items-center gap-3">
              <div className="shrink-0 ring-1 ring-blueExtraLight/60">
                {img ? (
                  <NextProductImageWithSkeleton
                    src={img}
                    alt=""
                    width={50}
                    height={50}
                    className="rounded-md"
                    sizes="50px"
                    unoptimized={img.startsWith("/uploads/")}
                  />
                ) : (
                  <div className="flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-md bg-blueUltraLight px-1 text-center text-[9px] font-medium leading-tight text-blueSteel">
                    Нет фото
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="line-clamp-2 text-sm font-bold text-blueNavy">{h.name}</span>
                <span className="text-xs font-semibold text-blueSteel2">{formatPriceRub(h.price)}</span>
              </div>
            </div>
          );

          const rowClass = `block px-3 py-2 hover:bg-blueUltraLight ${
            highlighted ? "bg-blueUltraLight" : ""
          }`;

          return href ? (
            <Link
              key={h.id}
              href={href}
              prefetch={false}
              className={rowClass}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onPick}
              onMouseEnter={() => onHighlightIndexChange?.(index)}
            >
              {row}
            </Link>
          ) : (
            <div
              key={h.id}
              className={`px-3 py-2 opacity-60 ${highlighted ? "bg-blueUltraLight opacity-100" : ""}`}
              onMouseEnter={() => onHighlightIndexChange?.(index)}
            >
              {row}
            </div>
          );
        })
      )}
    </div>
  );
}
