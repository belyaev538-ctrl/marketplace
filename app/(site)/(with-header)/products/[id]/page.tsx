import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productPublicPath } from "@/lib/product-url";

type Props = { params: { id: string } };

/** Редирект на канонический URL по slug. */
export default async function LegacyProductByIdPage({ params }: Props) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { slug: true, store: { select: { slug: true } } },
  });

  if (!product) {
    notFound();
  }

  if (!product.slug?.trim()) {
    notFound();
  }

  const target =
    productPublicPath(product.store.slug, product.slug.trim()) ??
    `/product/${encodeURIComponent(product.slug.trim())}`;
  redirect(target);
}
