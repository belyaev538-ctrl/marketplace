import type { CatalogProductItem } from "@/app/(site)/(with-header)/catalog/catalog-product-grid";
import type { ProductPageViewModel } from "@/components/product-page-view";
import { prisma } from "@/lib/prisma";

function uniqFulfillmentModes(modes: string[]): string[] {
  return Array.from(new Set(modes.filter((m) => m !== "both")));
}

async function loadRelatedItems(
  product: ProductPageViewModel,
): Promise<CatalogProductItem[]> {
  const relatedRows = await prisma.product.findMany({
    where: {
      active: true,
      id: { not: product.id },
      storeId: product.storeId,
      images: { some: { url: { not: "" } } },
    },
    include: {
      images: { take: 1, orderBy: { id: "asc" }, select: { url: true } },
      store: { select: { slug: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const modes = uniqFulfillmentModes(product.store.fulfillmentModes as string[]);

  return relatedRows.map((r) => {
    const s = (r.slug ?? "").trim();
    return {
      id: r.id,
      slug: s === "" ? null : s,
      storeSlug: r.store.slug.trim(),
      name: r.name,
      price: r.price,
      imageUrl: r.images[0]?.url ?? null,
      storeName: product.store.name,
      storeLogoUrl: product.store.logo?.trim() || null,
      fulfillmentModes: modes,
    };
  });
}

/** Публичная карточка по глобальному slug товара (`/product/:slug`). */
export async function loadProductPublicPageByProductSlug(
  productSlug: string,
): Promise<{ product: ProductPageViewModel; relatedItems: CatalogProductItem[] } | null> {
  const slug = productSlug.trim();
  if (!slug) return null;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { id: "asc" } },
      store: true,
    },
  });

  if (
    !product ||
    !product.active ||
    !product.store.active ||
    !product.store.showProducts
  ) {
    return null;
  }

  const relatedItems = await loadRelatedItems(product);
  return { product, relatedItems };
}

/** Публичная карточка по `/{storeSlug}/{productSlug}`. */
export async function loadProductPublicPageByStoreAndProductSlug(
  storeSlug: string,
  productSlug: string,
): Promise<{ product: ProductPageViewModel; relatedItems: CatalogProductItem[] } | null> {
  const ss = storeSlug.trim();
  const ps = productSlug.trim();
  if (!ss || !ps) return null;

  const product = await prisma.product.findFirst({
    where: {
      slug: ps,
      active: true,
      store: {
        slug: ss,
        active: true,
        showProducts: true,
      },
    },
    include: {
      images: { orderBy: { id: "asc" } },
      store: true,
    },
  });

  if (!product) return null;

  const relatedItems = await loadRelatedItems(product);
  return { product, relatedItems };
}
