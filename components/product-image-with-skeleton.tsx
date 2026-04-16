"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

function useImageLoadedState(src: string) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
  }, [src]);
  const markLoaded = useCallback(() => {
    setLoaded(true);
  }, []);
  return { loaded, markLoaded };
}

const skeletonLayerClass =
  "pointer-events-none absolute inset-0 bg-[#E5E9EF] animate-pulse transition-opacity duration-500 ease-out motion-reduce:animate-none";

type NativeProps = {
  src: string;
  alt: string;
  /** Обёртка: задайте размеры (например `absolute inset-0` или `h-full w-full`). */
  className?: string;
  imgClassName?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
  /**
   * Ширина до родителя (`max-w`), высота по пропорциям картинки (`object-contain`).
   * Иначе — заполнение блока (`absolute` + object-cover по умолчанию).
   */
  intrinsic?: boolean;
};

/** Нативный `<img>`: скелетон до `onLoad`, затем плавное появление (внешние URL товаров). */
export function ProductImageWithSkeleton({
  src,
  alt,
  className,
  imgClassName,
  loading,
  decoding = "async",
  intrinsic = false,
}: NativeProps) {
  const { loaded, markLoaded } = useImageLoadedState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalHeight > 0) {
      markLoaded();
    }
  }, [src, markLoaded]);

  if (intrinsic) {
    return (
      <div
        className={`relative w-full overflow-hidden bg-blueUltraLight ${!loaded ? "min-h-[200px]" : ""} ${className ?? ""}`}
      >
        <div
          className={`${skeletonLayerClass} ${loaded ? "opacity-0" : "opacity-100"}`}
          aria-hidden
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- произвольные URL витрин */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={markLoaded}
          loading={loading}
          decoding={decoding}
          className={`relative z-[1] block h-auto w-full max-w-full object-contain transition-opacity duration-500 ease-out ${imgClassName ?? ""} ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-blueUltraLight ${className ?? "h-full w-full"}`}>
      <div className={`${skeletonLayerClass} ${loaded ? "opacity-0" : "opacity-100"}`} aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element -- произвольные URL витрин */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onLoad={markLoaded}
        loading={loading}
        decoding={decoding}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ease-out ${imgClassName ?? "object-cover"} ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

type NextProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  unoptimized?: boolean;
  priority?: boolean;
};

/** `next/image`: скелетон до `onLoadingComplete`, затем плавное появление. */
export function NextProductImageWithSkeleton({
  src,
  alt,
  width,
  height,
  className,
  imgClassName = "object-cover",
  sizes,
  unoptimized,
  priority,
}: NextProps) {
  const { loaded, markLoaded } = useImageLoadedState(src);

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-blueUltraLight ${className ?? ""}`}
      style={{ width, height }}
    >
      <div className={`${skeletonLayerClass} ${loaded ? "opacity-0" : "opacity-100"}`} aria-hidden />
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        unoptimized={unoptimized}
        priority={priority}
        onLoadingComplete={markLoaded}
        className={`h-full w-full transition-opacity duration-500 ease-out ${imgClassName} ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
