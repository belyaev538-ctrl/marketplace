"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav-config";
import { SignOutButton } from "@/components/sign-out-button";

type AdminSidebarProps = {
  userEmail: string | null;
};

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-[100dvh] min-h-0 w-64 shrink-0 flex-col overflow-y-auto border-r border-white/20 bg-[#052850] shadow-sm shadow-[#34588212]">
      <div className="border-b border-white/20 px-5 py-5">
        <Link
          href="/admin/stores"
          className="mb-3 block outline-none ring-blue focus-visible:ring-2"
          aria-label="К списку магазинов"
        >
          <Image
            src="/mlavka/img/logo.svg"
            alt=""
            width={200}
            height={34}
            className="h-8 w-auto max-w-[200px] brightness-0 invert"
            priority
          />
        </Link>
        <Link href="/admin/stores" className="text-lg font-extrabold text-white transition-colors hover:text-white/90">
          Админка
        </Link>
        <p className="mt-1 text-xs font-medium text-white/80">Панель управления</p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 p-3" aria-label="Разделы админки">
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                active
                  ? "bg-[#0B63CE] text-white"
                  : "text-white hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col gap-2 border-t border-white/20 pt-3">
          {userEmail ? (
            <span
              className="truncate text-xs font-medium text-white/80"
              title={userEmail}
            >
              {userEmail}
            </span>
          ) : (
            <span className="text-xs text-white/80">Администратор</span>
          )}
          <SignOutButton className="inline-flex h-[45px] w-full items-center justify-center rounded-lg border border-white/25 bg-white/10 px-3 text-center text-[14px] font-medium text-white transition-colors hover:border-white/40 hover:bg-white/20 hover:text-white" />
        </div>
      </nav>

      <div className="border-t border-white/20 p-3">
        <Link
          href="/catalog"
          className="inline-flex h-[45px] w-full items-center justify-center rounded-[6px] bg-green px-3 text-center text-[13px] font-semibold text-white transition-colors hover:opacity-95"
        >
          Открыть маркетплейс
        </Link>
      </div>
    </aside>
  );
}
