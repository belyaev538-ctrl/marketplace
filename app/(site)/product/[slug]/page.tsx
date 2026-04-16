import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPageView, metaDescriptionFromProduct } from "@/components/product-page-view";
import { loadProductPublicPageByProductSlug } from "@/lib/product-page-data";
import { prisma } from "@/lib/prisma";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const raw = params?.slug;
  if (raw === undefined || raw === null) {
    return { title: "Товар" };
  }
  const slug = String(raw).trim();
  if (slug === "") {
    return { title: "Товар" };
  }
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      price: true,
      availability: true,
      active: true,
      store: { select: { active: true, showProducts: true } },
    },
  });
  if (
    !product ||
    !product.active ||
    !product.store.active ||
    !product.store.showProducts
  ) {
    return { title: "Товар" };
  }
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

export default async function ProductBySlugPage({ params }: Props) {
  const raw = params?.slug;
  if (raw === undefined || raw === null) {
    notFound();
  }
  const slug = String(raw).trim();
  if (slug === "") {
    notFound();
  }

  const data = await loadProductPublicPageByProductSlug(slug);
  if (!data) {
    notFound();
  }

  return <ProductPageView product={data.product} relatedItems={data.relatedItems} />;
}
