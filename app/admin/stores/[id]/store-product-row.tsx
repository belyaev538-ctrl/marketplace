"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductActiveToggle } from "./product-active-toggle";

type Props = {
  productId: string;
  storeId: string;
  name: string;
  imageUrl: string | null;
  initialActive: boolean;
  /** Категория из XML-выгрузки (SourceCategory). */
  feedCategoryName: string | null;
  /** Рубрики витрины по привязке этой категории фида. */
  marketplaceCategoryNames: string[];
};

export function StoreProductRow({
  productId,
  storeId,
  name,
  imageUrl,
  initialActive,
  feedCategoryName,
  marketplaceCategoryNames,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen, closeLightbox]);

  const vitrinaLine =
    marketplaceCategoryNames.length > 0
      ? marketplaceCategoryNames.join(", ")
      : "нет привязки к рубрикам витрины";

  return (
    <>
      <div className="flex flex-wrap items-start gap-3 border-b border-blueExtraLight py-3 sm:flex-nowrap sm:items-center">
        <div className="shrink-0">
          {imageUrl ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block h-[50px] w-[50px] overflow-hidden rounded border border-blueExtraLight bg-blueUltraLight/50 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue focus:ring-offset-1"
              aria-label={`Открыть фото: ${name}`}
            >
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
                width={50}
                height={50}
              />
            </button>
          ) : (
            <div
              className="flex h-[50px] w-[50px] items-center justify-center rounded border border-dashed border-blueExtraLight bg-blueUltraLight/40 text-[10px] font-medium text-blueSteel"
              aria-hidden
            >
              нет фото
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-blueNavy">{name}</div>
          <div className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-blueSteel">
            <p>
              <span className="font-bold text-blueNavy/90">Выгрузка:</span>{" "}
              {feedCategoryName ?? "категория в фиде не указана"}
            </p>
            <p>
              <span className="font-bold text-blueNavy/90">Витрина:</span>{" "}
              <span
                className={
                  marketplaceCategoryNames.length === 0 ? "font-medium text-amber-800" : undefined
                }
              >
                {vitrinaLine}
              </span>
            </p>
          </div>
        </div>
        <div className="shrink-0 self-center">
          <ProductActiveToggle
            productId={productId}
            storeId={storeId}
            initialActive={initialActive}
          />
        </div>
      </div>

      {lightboxOpen && imageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Фото: ${name}`}
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl leading-none text-blueNavy shadow-md transition hover:bg-blueUltraLight focus:outline-none focus:ring-2 focus:ring-blue"
            aria-label="Закрыть"
          >
            ×
          </button>
          <div
            className="relative max-h-[85vh] max-w-[min(90vw,900px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={name}
              className="max-h-[85vh] w-auto max-w-full rounded object-contain shadow-lg"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
