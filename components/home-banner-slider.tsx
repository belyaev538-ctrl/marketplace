"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

import {
  REFERENCE_LAYOUT_BANNER_SUBTITLE,
  type HomeBannerSlide,
} from "@/lib/home-banners";

function NavNextIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="20" cy="20" r="19.5" transform="matrix(-1 0 0 1 40 0)" fill="white" stroke="#F3F8FF" />
      <rect
        x="28.6641"
        y="19.7422"
        width="2"
        height="8.1193"
        rx="1"
        transform="rotate(135 28.6641 19.7422)"
        fill="#B7C5D5"
      />
      <rect
        width="2"
        height="8.12482"
        rx="1"
        transform="matrix(-0.707107 -0.707106 -0.707106 0.707107 28.6641 19.748)"
        fill="#B7C5D5"
      />
      <rect
        width="2"
        height="17"
        rx="1"
        transform="matrix(4.37114e-08 1 1 -4.37114e-08 11 19)"
        fill="#B7C5D5"
      />
    </svg>
  );
}

function NavPrevIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="20" cy="20" r="19.5" fill="white" stroke="#F3F8FF" />
      <rect
        width="2"
        height="8.1193"
        rx="1"
        transform="matrix(0.707107 0.707106 0.707106 -0.707107 11.3359 19.7422)"
        fill="#B7C5D5"
      />
      <rect
        x="11.3359"
        y="19.748"
        width="2"
        height="8.12482"
        rx="1"
        transform="rotate(-45 11.3359 19.748)"
        fill="#B7C5D5"
      />
      <rect x="29" y="19" width="2" height="17" rx="1" transform="rotate(90 29 19)" fill="#B7C5D5" />
    </svg>
  );
}

type Props = {
  slides: HomeBannerSlide[];
};

export function HomeBannerSlider({ slides }: Props) {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);

  const list = useMemo(() => slides.filter((s) => s.image?.trim()), [slides]);

  const goPrev = useCallback(() => {
    swiper?.slidePrev();
  }, [swiper]);

  const goNext = useCallback(() => {
    swiper?.slideNext();
  }, [swiper]);

  if (list.length === 0) {
    return null;
  }

  const loopEnabled = list.length > 1;

  return (
    <section className="banner pb-[30px] md:pb-[50px]" aria-label="Рекламные баннеры">
      <div className="mx-auto w-full max-w-[1385px] px-[15px]">
        <div className="home-banner-swiper relative">
          <Swiper
            className="bannerSlide"
            modules={[EffectFade, Autoplay, Pagination]}
            effect="fade"
            loop={loopEnabled}
            speed={400}
            spaceBetween={20}
            autoplay={
              loopEnabled
                ? { delay: 3000, disableOnInteraction: false }
                : false
            }
            pagination={{ clickable: true }}
            onSwiper={setSwiper}
          >
            {list.map((slide, i) => {
              const text = (slide.subtitle?.trim() || REFERENCE_LAYOUT_BANNER_SUBTITLE).trim();
              return (
                <SwiperSlide key={`${slide.image}-${i}`}>
                  <div className="relative flex h-[200px] w-full flex-col gap-2 overflow-hidden rounded-xl px-3 py-[59px] md:gap-1.5 md:px-[37px] md:py-[58px]">
                    {slide.linkUrl ? (
                      <a
                        href={slide.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-[3]"
                        aria-label={slide.title}
                      />
                    ) : null}
                    <p className="relative z-[4] max-w-[202px] text-base font-extrabold leading-4 text-white md:max-w-full md:text-[22px] md:leading-normal">
                      {slide.title}
                    </p>
                    <p className="relative z-[4] max-w-[209px] text-[8.44px] font-medium leading-[108%] text-white md:max-w-[607px] md:text-xs">
                      {text}
                    </p>
                    <Image
                      src={slide.image}
                      alt=""
                      fill
                      className="-z-10 rounded-xl object-cover"
                      sizes="(max-width: 1385px) 100vw, 1385px"
                      priority={i === 0}
                    />
                    <span className="absolute bottom-5 right-5 z-[4] rounded-[3px] bg-[#3e68974d] px-1.5 py-1 text-[10px] text-white">
                      РЕКЛАМА
                    </span>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {loopEnabled ? (
            <>
              <button
                type="button"
                className="home-banner-nav-next absolute right-0 top-[100px] z-10 hidden -translate-y-1/2 md:flex"
                aria-label="Следующий слайд"
                onClick={goNext}
              >
                <NavNextIcon />
              </button>
              <button
                type="button"
                className="home-banner-nav-prev absolute left-0 top-[100px] z-10 hidden -translate-y-1/2 md:flex"
                aria-label="Предыдущий слайд"
                onClick={goPrev}
              >
                <NavPrevIcon />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
