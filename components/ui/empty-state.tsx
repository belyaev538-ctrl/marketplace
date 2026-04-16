"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type EmptyStateProps = {
  title?: string;
  description?: string;
  className?: string;
  actionHref?: string;
  actionLabel?: string;
  actionIconSrc?: string;
};

export function EmptyState({
  title = "Ничего не найдено",
  description = "В вашем радиусе нет доступных магазинов и товаров. Попробуйте увеличить радиус поиска.",
  className = "",
  actionHref = "/choose-location",
  actionLabel = "Задать радиус поиска",
  actionIconSrc = "/mlavka/img/map-icon.svg",
}: EmptyStateProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? "";
  const returnTo = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
  const resolvedActionHref =
    actionHref === "/choose-location"
      ? `/choose-location?returnTo=${encodeURIComponent(returnTo)}`
      : actionHref;

  return (
    <div className={`flex min-h-[220px] w-full flex-col items-center justify-center px-6 py-10 text-center ${className}`}>
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF3FA] text-[#7C94B0]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21C12 21 19 14.5 19 9.5C19 5.91 16.09 3 12.5 3C8.91 3 6 5.91 6 9.5C6 14.5 12 21 12 21Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12.5" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[#4F6580]">{title}</h3>
      <p className="mt-2 max-w-[520px] text-[13px] font-medium leading-relaxed text-[#8298B1]">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={resolvedActionHref}
          prefetch={false}
          className="group mt-5 inline-flex h-[48px] items-center gap-2 whitespace-nowrap rounded-[10px] border border-[#036FEF] py-3.5 ps-4 pe-[13px] text-[13px] font-semibold text-[#036FEF] transition-colors hover:bg-[#036FEF] hover:text-white"
        >
          {actionIconSrc ? (
            <Image
              src={actionIconSrc}
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px] shrink-0 transition-[filter] group-hover:brightness-0 group-hover:invert"
            />
          ) : null}
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

