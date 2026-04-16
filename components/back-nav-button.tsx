"use client";

import { useRouter } from "next/navigation";

type Props = {
  fallbackHref: string;
  label?: string;
  className?: string;
};

export function BackNavButton({ fallbackHref, label = "Назад", className }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className={
        className ??
        "inline-flex items-center gap-2 text-sm font-semibold text-blue transition-colors hover:text-blueDark"
      }
    >
      <span className="group inline-flex h-[39px] w-[39px] shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent p-0 text-[#3E6897] shadow-none transition-colors hover:bg-blue hover:text-white">
        <svg width="39" height="39" viewBox="0 0 39 39" fill="none" aria-hidden className="h-[39px] w-[39px]">
          <rect
            x="0.5"
            y="0.5"
            width="38"
            height="38"
            rx="19"
            fill="currentColor"
            fillOpacity="0.08"
            className="transition-[fill,stroke] group-hover:fill-white/20"
          />
          <rect x="11" y="18.2109" width="19" height="2" rx="1" fill="currentColor" />
          <rect
            x="10"
            y="19.2168"
            width="8.79133"
            height="1.99718"
            rx="0.998588"
            transform="rotate(-45 10 19.2168)"
            fill="currentColor"
          />
          <rect
            width="9.08064"
            height="2"
            rx="1"
            transform="matrix(0.707107 0.707107 0.707107 -0.707107 10 19.207)"
            fill="currentColor"
          />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}
