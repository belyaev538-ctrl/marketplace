import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPageView, metaDescriptionFromProduct } from "@/components/product-page-view";
import { loadProductPublicPageByStoreAndProductSlug } from "@/lib/product-page-data";
import { prisma } from "@/lib/prisma";
import { PRODUCT_URL_RESERVED_FIRST_SEGMENTS } from "@/lib/product-url";

type Props = { params: { storeSlug: string; productSlug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const storeSlug = params?.storeSlug?.trim() ?? "";
  const productSlug = params?.productSlug?.trim() ?? "";
  if (!storeSlug || !productSlug) return { title: "Товар" };

  const product = await prisma.product.findFirst({
    where: {
      slug: productSlug,
      active: true,
      store: { slug: storeSlug, active: true, showProducts: true },
    },
    select: {
      name: true,
      description: true,
      price: true,
      availability: true,
    },
  });
  if (!product) return { title: "Товар" };
  return {
    title: `${product.name} — цена, наличие`,
    description: metaDescriptionFromProduct(
      product.name,
      product.price,
      product.availability,
      product.description,
    ),
  };
}

export default async function ProductByStoreAndSlugPage({ params }: Props) {
  const storeSlug = params?.storeSlug?.trim() ?? "";
  const productSlug = params?.productSlug?.trim() ?? "";
  if (!storeSlug || !productSlug) {
    notFound();
  }
  if (PRODUCT_URL_RESERVED_FIRST_SEGMENTS.has(storeSlug.toLowerCase())) {
    notFound();
  }

  const data = await loadProductPublicPageByStoreAndProductSlug(storeSlug, productSlug);
  if (!data) {
    notFound();
  }

  return <ProductPageView product={data.product} relatedItems={data.relatedItems} />;
}
