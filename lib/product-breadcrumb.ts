import { prisma } from "@/lib/prisma";
import { catalogCategoryPath } from "@/lib/catalog-url";

export type ProductBreadcrumbItem = {
  label: string;
  href: string | null;
};

/**
 * Цепочка для крошек: Каталог → предки marketplace-категории → лист (по маппингу товара).
 * Без маппинга — только пункт «Каталог» (остальное добавляет страница).
 */
export async function getMarketplaceCategoryTrailForProduct(
  storeId: string,
  sourceCategoryId: string | null,
): Promise<{ name: string; slug: string }[]> {
  if (!sourceCategoryId) return [];

  const mapping = await prisma.categoryMapping.findFirst({
    where: { storeId, sourceCategoryId },
    select: { marketplaceCategoryId: true },
  });
  if (!mapping) return [];

  const chainIds: string[] = [mapping.marketplaceCategoryId];
  for (;;) {
    const head = chainIds[0];
    const parentRow = await prisma.marketplaceCategory.findUnique({
      where: { id: head },
      select: { parentId: true },
    });
    const p = parentRow?.parentId;
    if (!p) break;
    chainIds.unshift(p);
  }

  const rows = await prisma.marketplaceCategory.findMany({
    where: { id: { in: chainIds } },
    select: { id: true, name: true, slug: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  return chainIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => r != null)
    .map((r) => ({ name: r.name, slug: r.slug }));
}

/** Цепочка marketplace-категорий от корня к листу (включая лист). */
export async function getMarketplaceCategoryTrailRootToLeaf(
  leafCategoryId: string,
): Promise<{ name: string; slug: string }[]> {
  const chainIds: string[] = [leafCategoryId];
  for (;;) {
    const head = chainIds[0];
    const parentRow = await prisma.marketplaceCategory.findUnique({
      where: { id: head },
      select: { parentId: true },
    });
    const p = parentRow?.parentId;
    if (!p) break;
    chainIds.unshift(p);
  }
  const rows = await prisma.marketplaceCategory.findMany({
    where: { id: { in: chainIds } },
    select: { id: true, name: true, slug: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return chainIds
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => r != null)
    .map((r) => ({ name: r.name, slug: r.slug }));
}

/** Крошки для витрины категории (`/catalog/[slug]` или `?category=`). */
export function buildCategoryCatalogBreadcrumbItems(
  trailRootToLeaf: { name: string; slug: string }[],
): ProductBreadcrumbItem[] {
  const items: ProductBreadcrumbItem[] = [{ label: "Каталог", href: "/catalog" }];
  if (trailRootToLeaf.length === 0) return items;
  for (let i = 0; i < trailRootToLeaf.length - 1; i++) {
    const c = trailRootToLeaf[i];
    items.push({ label: c.name, href: catalogCategoryPath(c.slug) });
  }
  const leaf = trailRootToLeaf[trailRootToLeaf.length - 1];
  items.push({ label: leaf.name, href: null });
  return items;
}

/** Собирает массив крошек: каталог, категории (или витрина магазина), название товара. */
export function buildProductBreadcrumbItems(
  categoryTrail: { name: string; slug: string }[],
  productName: string,
  storeSlug: string,
  storeName: string,
): ProductBreadcrumbItem[] {
  const items: ProductBreadcrumbItem[] = [
    { label: "Каталог", href: "/catalog" },
  ];

  if (categoryTrail.length === 0) {
    items.push({
      label: storeName,
      href: `/stores/${encodeURIComponent(storeSlug)}`,
    });
  } else {
    for (const c of categoryTrail) {
      items.push({
        label: c.name,
        href: catalogCategoryPath(c.slug),
      });
    }
  }

  items.push({ label: productName, href: null });
  return items;
}
