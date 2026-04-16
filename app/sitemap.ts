import type { MetadataRoute } from "next";
import { buildCatalogProductWhere } from "@/lib/catalog-products-query";
import { prisma } from "@/lib/prisma";
import { siteOrigin } from "@/lib/site-url";
import { productPublicPath } from "@/lib/product-url";

/** Кэш sitemap, секунды (данные из БД). */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();

  const [categories, products, stores] = await Promise.all([
    prisma.marketplaceCategory.findMany({
      select: { slug: true },
    }),
    prisma.product.findMany({
      where: buildCatalogProductWhere(undefined, []),
      select: { slug: true, updatedAt: true, store: { select: { slug: true } } },
    }),
    prisma.store.findMany({
      where: { active: true, mappings: { some: {} } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const home: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const categoryUrls: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/catalog/${encodeURIComponent(c.slug)}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productUrls: MetadataRoute.Sitemap = products.flatMap((p) => {
    const slug = (p.slug ?? "").trim();
    if (!slug) return [];
    const path = productPublicPath(p.store.slug, slug);
    if (!path) return [];
    return [
      {
        url: `${base}${path}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ];
  });

  const storeUrls: MetadataRoute.Sitemap = stores.map((s) => ({
    url: `${base}/stores/${encodeURIComponent(s.slug)}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...home, ...categoryUrls, ...productUrls, ...storeUrls];
}
