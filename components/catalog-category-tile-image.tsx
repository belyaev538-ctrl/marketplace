"use client";

import { useCallback, useState } from "react";

type Phase = "png" | "svg" | "fallback";

type Props = {
  svgSrc: string;
  pngSrc: string;
  fallbackSrc: string;
  className: string;
};

/**
 * Иконки в репозитории чаще как .png; сначала .png — меньше «битой» картинки до onError и лишних 404.
 * Дальше: .svg → заглушка category-img.
 */
export function CatalogCategoryTileImage({ svgSrc, pngSrc, fallbackSrc, className }: Props) {
  const [phase, setPhase] = useState<Phase>("png");

  const src =
    phase === "png" ? pngSrc : phase === "svg" ? svgSrc : fallbackSrc;

  const onError = useCallback(() => {
    setPhase((p) => {
      if (p === "png") return "svg";
      if (p === "svg") return "fallback";
      return "fallback";
    });
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- смена src по onError
    <img
      src={src}
      alt=""
      width={162}
      height={100}
      onError={onError}
      className={className}
    />
  );
}
