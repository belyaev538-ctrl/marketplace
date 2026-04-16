"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import type { Swiper as SwiperType } from "swiper";
import { FreeMode, Keyboard, Navigation, Thumbs } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";

import { ProductImageWithSkeleton } from "@/components/product-image-with-skeleton";

type Props = {
  /** URL изображений по порядку */
  images: string[];
  productName: string;
};

/** Ширину ограничивает родитель страницы товара (до 410px на md+). */
const WRAP = "w-full min-w-0";
const IMG_DIM = 800;

function GallerySlideImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority: boolean;
}) {
  return (
    <ProductImageWithSkeleton
      src={src}
      alt={alt}
      intrinsic
      imgClassName="cursor-zoom-in"
      loading={priority ? "eager" : "lazy"}
    />
  );
}

export function ProductGallery({ images, productName }: Props) {
  const dialogId = useId();
  const lightboxSwiperRef = useRef<SwiperType | null>(null);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);

  const openLightbox = useCallback((index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleLightboxClose = useCallback(
    (endRealIndex: number) => {
      setActiveIndex(endRealIndex);
      if (mainSwiper && !mainSwiper.destroyed) {
        mainSwiper.slideTo(endRealIndex);
      }
      setLightboxOpen(false);
    },
    [mainSwiper],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const s = lightboxSwiperRef.current;
        const idx = s && !s.destroyed ? s.realIndex : activeIndex;
        handleLightboxClose(idx);
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, activeIndex, handleLightboxClose]);

  if (images.length === 0) {
    return (
      <div
        className={`flex min-h-[200px] ${WRAP} items-center justify-center rounded-xl border border-blueExtraLight bg-blueUltraLight text-sm text-blueSteel`}
      >
        Нет изображения
      </div>
    );
  }

  if (images.length === 1) {
    const src = images[0];
    return (
      <div className={`${WRAP}`}>
        <button
          type="button"
          className="relative block w-full overflow-hidden rounded-xl border border-blueExtraLight bg-white text-left outline-none ring-blue focus-visible:ring-2"
          onClick={() => openLightbox(0)}
          aria-haspopup="dialog"
          aria-expanded={lightboxOpen}
          aria-controls={dialogId}
        >
          <GallerySlideImage src={src} alt={productName} priority />
        </button>
        {lightboxOpen ? (
          <LightboxOverlay
            id={dialogId}
            images={images}
            productName={productName}
            initialIndex={0}
            onClose={handleLightboxClose}
            swiperRef={lightboxSwiperRef}
          />
        ) : null}
      </div>
    );
  }

  const thumbsReady = thumbsSwiper && !thumbsSwiper.destroyed;

  return (
    <div className={`${WRAP} flex flex-col gap-3`}>
      <div className="relative w-full overflow-hidden rounded-xl border border-blueExtraLight bg-white">
        <Swiper
          modules={[Thumbs]}
          spaceBetween={0}
          slidesPerView={1}
          autoHeight
          thumbs={{ swiper: thumbsReady ? thumbsSwiper : undefined }}
          className="product-gallery-main w-full"
          onSwiper={setMainSwiper}
          onSlideChange={(s) => setActiveIndex(s.activeIndex)}
        >
          {images.map((src, i) => (
            <SwiperSlide key={`${src}-${i}`} className="!flex">
              <button
                type="button"
                className="relative flex w-full min-w-0 bg-white text-left outline-none ring-blue focus-visible:ring-2"
                onClick={() => openLightbox(i)}
                aria-label={`Открыть фото ${i + 1} во весь экран`}
              >
                <GallerySlideImage
                  src={src}
                  alt={i === 0 ? productName : `${productName}, фото ${i + 1}`}
                  priority={i === 0}
                />
              </button>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <Swiper
        modules={[FreeMode, Thumbs]}
        onSwiper={setThumbsSwiper}
        spaceBetween={8}
        slidesPerView="auto"
        freeMode
        watchSlidesProgress
        className="product-gallery-thumbs w-full px-0.5"
        breakpoints={{
          0: { spaceBetween: 6 },
          480: { spaceBetween: 8 },
        }}
      >
        {images.map((src, i) => (
          <SwiperSlide
            key={`thumb-${src}-${i}`}
            className="!h-[64px] !w-[64px] shrink-0 sm:!h-[72px] sm:!w-[72px]"
          >
            <div className="relative h-full w-full overflow-hidden rounded-md">
              <ProductImageWithSkeleton
                src={src}
                alt=""
                className="absolute inset-0 h-full w-full"
                imgClassName="rounded-md object-cover"
                loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {lightboxOpen ? (
        <LightboxOverlay
          id={dialogId}
          images={images}
          productName={productName}
          initialIndex={activeIndex}
          onClose={handleLightboxClose}
          swiperRef={lightboxSwiperRef}
        />
      ) : null}
    </div>
  );
}

function LightboxOverlay({
  id,
  images,
  productName,
  initialIndex,
  onClose,
  swiperRef,
}: {
  id: string;
  images: string[];
  productName: string;
  initialIndex: number;
  onClose: (lastRealIndex: number) => void;
  swiperRef: MutableRefObject<SwiperType | null>;
}) {
  const closeWithSync = () => {
    const s = swiperRef.current;
    const idx = s && !s.destroyed ? s.realIndex : initialIndex;
    onClose(idx);
  };

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={`Галерея: ${productName}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90"
    >
      <button
        type="button"
        onClick={closeWithSync}
        className="absolute right-3 top-3 z-[110] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl font-light leading-none text-white transition-colors hover:bg-white/20 md:right-5 md:top-5"
        aria-label="Закрыть"
      >
        ×
      </button>

      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-6 pt-14 md:px-10 md:pb-10 md:pt-16"
        onClick={closeWithSync}
        role="presentation"
      >
        <div
          className="relative h-[min(85vh,calc(100vw-2rem))] w-full max-w-5xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Swiper
            modules={[Navigation, Keyboard]}
            navigation
            keyboard={{ enabled: true }}
            loop={images.length > 2}
            initialSlide={initialIndex}
            className="product-lightbox-swiper h-full w-full"
            onSwiper={(s) => {
              swiperRef.current = s;
            }}
          >
            {images.map((src, i) => (
              <SwiperSlide key={`lb-${src}-${i}`} className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={i === 0 ? productName : `${productName}, фото ${i + 1}`}
                  width={IMG_DIM}
                  height={IMG_DIM}
                  loading={i === initialIndex ? "eager" : "lazy"}
                  decoding="async"
                  className="max-h-[min(85vh,calc(100vw-2rem))] w-auto max-w-full object-contain"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
