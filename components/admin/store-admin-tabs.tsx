"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  storeId: string;
  unmappedCategoryCount: number;
};

const tabBase =
  "inline-flex h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-4 text-[13px] font-semibold transition-colors";
const tabIdle = "border-transparent bg-[#F3F8FF] text-[#0B63CE] hover:bg-[#E6F0FF]";
const tabActive = "border-[#0B63CE] bg-[#0B63CE] text-white shadow-[0_8px_20px_0_#0B63CE33]";

export function StoreAdminTabs({ storeId, unmappedCategoryCount }: Props) {
  const pathname = usePathname();
  const id = encodeURIComponent(storeId);
  const prefix = `/admin/stores/${id}`;

  const items: { href: string; label: string; match: (p: string) => boolean; badge?: number }[] =
    [
      {
        href: `${prefix}/settings`,
        label: "Настройки",
        match: (p) => p === `${prefix}/settings` || p === `${prefix}/edit`,
      },
      {
        href: `${prefix}/products`,
        label: "Товары",
        match: (p) => p.startsWith(`${prefix}/products`),
      },
      {
        href: `${prefix}/categories`,
        label: "Привязка категорий",
        match: (p) => p.startsWith(`${prefix}/categories`),
        badge: unmappedCategoryCount,
      },
    ];

  return (
    <nav
      className="mt-5 flex flex-wrap gap-2 border-b border-blueExtraLight pb-4"
      aria-label="Разделы магазина"
    >
      {items.map(({ href, label, match, badge }) => {
        const active = pathname ? match(pathname) : false;
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`${tabBase} ${active ? tabActive : tabIdle}`}
            aria-current={active ? "page" : undefined}
          >
            {label}
            {badge !== undefined && badge > 0 ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums ${
                  active ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
                }`}
                title="Категорий выгрузки без привязки"
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
