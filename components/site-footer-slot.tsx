"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { pathnameLooksLikeStoreProductPage } from "@/lib/product-url";

type Props = {
  /** Серверный `<Footer />` передаётся из `app/(site)/layout.tsx` — нельзя импортировать async Footer сюда. */
  footer: ReactNode;
};

/** Футер для публичного сайта; на карточке товара не показываем. */
export function SiteFooterSlot({ footer }: Props) {
  const pathname = usePathname();
  if (
    pathname === "/map" ||
    pathname.startsWith("/map/") ||
    pathname === "/product" ||
    pathname.startsWith("/product/") ||
    pathnameLooksLikeStoreProductPage(pathname)
  ) {
    return null;
  }
  return <>{footer}</>;
}
