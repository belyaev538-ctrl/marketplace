"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderCatalogMenuDesktopTrigger } from "@/components/header-catalog-menu";
import { pathnameLooksLikeStoreProductPage } from "@/lib/product-url";

function navLinkClass(active: boolean) {
  return [
    "nav_link text-sm text-blueNavy transition-colors hover:text-blue",
    active ? "active font-semibold" : "font-medium",
  ].join(" ");
}

export function HeaderDesktopMainNav() {
  const pathname = usePathname() ?? "";

  const productsActive =
    pathname === "/catalog" ||
    pathname.startsWith("/catalog/") ||
    pathname.startsWith("/search") ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/products/") ||
    pathnameLooksLikeStoreProductPage(pathname);

  const storesActive = pathname === "/stores" || pathname.startsWith("/stores/");
  const mapActive = pathname === "/map" || pathname.startsWith("/map/");

  return (
    <nav className="hidden items-center gap-[30px] lg:flex" aria-label="Основное меню">
      <HeaderCatalogMenuDesktopTrigger />
      <Link prefetch={false} href="/stores" className={navLinkClass(storesActive)}>
        Магазины
      </Link>
      <Link prefetch={false} href="/catalog" className={navLinkClass(productsActive)}>
        Товары
      </Link>
      <Link prefetch={false} href="/map/categories" className={navLinkClass(mapActive)}>
        Карта магазинов
      </Link>
    </nav>
  );
}
