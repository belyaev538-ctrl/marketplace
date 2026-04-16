import Image from "next/image";
import Link from "next/link";
import { HeaderDesktopMainNav } from "@/components/header-desktop-nav";
import {
  HeaderCatalogMenuMobileTrigger,
  HeaderCatalogMenuProvider,
} from "@/components/header-catalog-menu";
import { HeaderUserLocationLink } from "@/components/header-user-location-link";
import { catalogListableStoreWhere } from "@/lib/catalog-products-query";
import { getVisibleMarketplaceCategoryNav } from "@/lib/marketplace-catalog-categories";
import { buildStoreBusinessTypeTilesForCatalogMenu } from "@/lib/store-business-type";
import { prisma } from "@/lib/prisma";

export async function Header() {
  const [nav, storeRows] = await Promise.all([
    getVisibleMarketplaceCategoryNav(),
    prisma.store.findMany({
      where: catalogListableStoreWhere([]),
      select: { name: true, slug: true, businessTypes: true },
    }),
  ]);
  const storeBusinessTiles = buildStoreBusinessTypeTilesForCatalogMenu(storeRows);

  return (
    <HeaderCatalogMenuProvider
      categories={nav.categories}
      childCategories={nav.childCategories}
      storeBusinessTiles={storeBusinessTiles}
      stores={storeRows}
    >
    <header id="site-header" className="relative z-10 bg-white py-[18px] shadow-sm shadow-[#34588226] md:py-[14px]">
      <div className="mx-auto flex w-full max-w-[1385px] items-center justify-between gap-2.5 px-[15px]">
        <div className="flex min-w-0 items-center gap-4 lg:gap-9">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/" className="shrink-0" aria-label="На главную">
              <Image
                src="/mlavka/img/logo.svg"
                alt=""
                width={227}
                height={38}
                className="hidden h-[32px] w-auto sm:block md:h-[38px]"
                priority
              />
              <Image
                src="/mlavka/img/logo-mob.svg"
                alt=""
                width={120}
                height={32}
                className="h-8 w-auto sm:hidden"
                priority
              />
            </Link>
            <HeaderCatalogMenuMobileTrigger />
          </div>

          <HeaderDesktopMainNav />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 md:gap-4">
          <HeaderUserLocationLink />
        </div>
      </div>
    </header>
    </HeaderCatalogMenuProvider>
  );
}
