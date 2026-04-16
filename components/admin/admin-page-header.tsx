"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AdminPageHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminHome = pathname === "/admin/stores";

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-blueExtraLight bg-white px-6 py-4 shadow-sm shadow-[#3458820d]">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {isAdminHome ? (
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blueExtraLight bg-blueUltraLight px-3 py-2 text-sm font-semibold text-blueNavy transition-colors hover:border-blue hover:bg-white hover:text-blue"
          >
            <span aria-hidden>←</span>
            На сайт
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-blueExtraLight bg-blueUltraLight px-3 py-2 text-sm font-semibold text-blueNavy transition-colors hover:border-blue hover:bg-white hover:text-blue"
          >
            <span aria-hidden>←</span>
            Назад
          </button>
        )}
      </div>
    </header>
  );
}
