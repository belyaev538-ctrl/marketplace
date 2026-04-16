import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Прямые счётчики товаров по marketplaceCategoryId (как в GROUP BY маппинга).
 * При непустом `storeIds` — только товары магазинов из списка (пересечение с правилами витрины).
 * Пустой массив — пустая карта без запроса.
 */
async function getMarketplaceCategoryDirectProductCounts(
  storeIds?: string[] | null,
): Promise<Map<string, number>> {
  if (storeIds != null && storeIds.length === 0) {
    return new Map();
  }

  const storeFilter =
    storeIds != null && storeIds.length > 0
      ? Prisma.sql`AND p."storeId" IN (${Prisma.join(storeIds)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ marketplaceCategoryId: string; cnt: bigint }>>(
    Prisma.sql`
      SELECT cm."marketplaceCategoryId", COUNT(DISTINCT p.id)::bigint AS cnt
      FROM "Product" p
      INNER JOIN "Store" s ON s.id = p."storeId" AND s.active = true AND s."showProducts" = true
      INNER JOIN "CategoryMapping" cm
        ON cm."storeId" = p."storeId"
        AND cm."sourceCategoryId" = p."sourceCategoryId"
      WHERE p."active" = true
        AND p."sourceCategoryId" IS NOT NULL
        AND p."slug" IS NOT NULL
        AND trim(p."slug") <> ''
        AND EXISTS (SELECT 1 FROM "CategoryMapping" cm0 WHERE cm0."storeId" = s.id)
        AND EXISTS (
          SELECT 1 FROM "ProductImage" pi
          WHERE pi."productId" = p.id AND pi.url IS NOT NULL AND trim(pi.url) <> ''
        )
        ${storeFilter}
      GROUP BY cm."marketplaceCategoryId"
    `,
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.marketplaceCategoryId, Number(r.cnt));
  }
  return map;
}

/** Сколько привязок source→marketplace есть у активных магазинов с витриной (без требований к фото/slug товара). */
async function getMarketplaceCategoryMappingCounts(
  storeIds?: string[] | null,
): Promise<Map<string, number>> {
  if (storeIds != null && storeIds.length === 0) {
    return new Map();
  }

  const storeFilter =
    storeIds != null && storeIds.length > 0
      ? Prisma.sql`AND cm."storeId" IN (${Prisma.join(storeIds)})`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ marketplaceCategoryId: string; cnt: bigint }>>(
    Prisma.sql`
      SELECT cm."marketplaceCategoryId", COUNT(*)::bigint AS cnt
      FROM "CategoryMapping" cm
      INNER JOIN "Store" s ON s.id = cm."storeId" AND s.active = true AND s."showProducts" = true
      WHERE 1 = 1
        ${storeFilter}
      GROUP BY cm."marketplaceCategoryId"
    `,
  );
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.marketplaceCategoryId, Number(r.cnt));
  }
  return map;
}

export type NavCategoryRow = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  /** Товаров в поддереве этой marketplace-категории (с учётом маппинга). */
  count: number;
};

/**
 * Каталог / сайдбар: только категории с count > 0 в поддереве.
 * Родительская категория → товары из неё и всех потомков через resolveCatalogCategoryIds.
 */
export async function getVisibleMarketplaceCategoryNav(): Promise<{
  categories: NavCategoryRow[];
  childCategories: NavCategoryRow[];
}> {
  return getVisibleMarketplaceCategoryNavForStoreIds();
}

export async function getVisibleMarketplaceCategoryNavForStoreIds(
  storeIds?: string[] | null,
): Promise<{
  categories: NavCategoryRow[];
  childCategories: NavCategoryRow[];
}> {
  const [countsByMarketplaceId, mappingCountsByMpId] = await Promise.all([
    getMarketplaceCategoryDirectProductCounts(storeIds),
    getMarketplaceCategoryMappingCounts(storeIds),
  ]);

  const allCats = await prisma.marketplaceCategory.findMany({
    select: { id: true, parentId: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const c of allCats) {
    if (c.parentId == null) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }

  const subtreeMemo = new Map<string, number>();
  function subtreeProductCount(id: string): number {
    if (subtreeMemo.has(id)) return subtreeMemo.get(id)!;
    let sum = countsByMarketplaceId.get(id) ?? 0;
    for (const kid of childrenByParent.get(id) ?? []) {
      sum += subtreeProductCount(kid);
    }
    subtreeMemo.set(id, sum);
    return sum;
  }

  const categories = allCats
    .filter((c) => c.parentId === null && subtreeProductCount(c.id) > 0)
    .map((c) => ({
      id: c.id,
      parentId: c.parentId,
      name: c.name,
      slug: c.slug,
      count: subtreeProductCount(c.id),
    }));

  const childCategories = allCats
    .filter((c) => {
      if (c.parentId === null) return false;
      const st = subtreeProductCount(c.id);
      if (st > 0) return true;
      return (mappingCountsByMpId.get(c.id) ?? 0) > 0;
    })
    .map((c) => ({
      id: c.id,
      parentId: c.parentId,
      name: c.name,
      slug: c.slug,
      count: subtreeProductCount(c.id),
    }));

  return { categories, childCategories };
}

export type MarketplaceCategoryHomeItem = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

async function buildHomeMarketplaceRootsFromCounts(
  countsByMarketplaceId: Map<string, number>,
): Promise<MarketplaceCategoryHomeItem[]> {
  const allCats = await prisma.marketplaceCategory.findMany({
    select: { id: true, parentId: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const c of allCats) {
    if (c.parentId == null) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }

  function collectDescendantsIncludingSelf(rootId: string): Set<string> {
    const out = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      if (out.has(id)) continue;
      out.add(id);
      const kids = childrenByParent.get(id) ?? [];
      stack.push(...kids);
    }
    return out;
  }

  const roots = allCats.filter((c) => c.parentId === null);
  const result: MarketplaceCategoryHomeItem[] = [];

  for (const root of roots) {
    const subtree = collectDescendantsIncludingSelf(root.id);
    let count = 0;
    subtree.forEach((mcId) => {
      count += countsByMarketplaceId.get(mcId) ?? 0;
    });
    if (count > 0) {
      result.push({ id: root.id, name: root.name, slug: root.slug, count });
    }
  }

  return result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

/**
 * Родительские категории для главной: только с count > 0 в поддереве.
 */
export async function getHomeMarketplaceCategoriesWithCounts(): Promise<
  MarketplaceCategoryHomeItem[]
> {
  const countsByMarketplaceId = await getMarketplaceCategoryDirectProductCounts();
  return buildHomeMarketplaceRootsFromCounts(countsByMarketplaceId);
}

/**
 * Родительские категории с подсчётом только по товарам магазинов из `storeIds`
 * (например магазины в радиусе от точки пользователя на карте).
 */
export async function getHomeMarketplaceCategoriesWithCountsForStoreIds(
  storeIds: string[],
): Promise<MarketplaceCategoryHomeItem[]> {
  const countsByMarketplaceId = await getMarketplaceCategoryDirectProductCounts(storeIds);
  return buildHomeMarketplaceRootsFromCounts(countsByMarketplaceId);
}

/**
 * Дочерние категории для выбранной родительской категории (по slug) с count > 0 в поддереве.
 * Используется, например, на карте: сначала показываем корни, затем их подкатегории.
 */
export async function getMarketplaceChildCategoriesWithCountsByParentSlug(
  parentSlug: string,
): Promise<MarketplaceCategoryHomeItem[]> {
  const slug = parentSlug.trim();
  if (!slug) return [];

  const [countsByMarketplaceId, mappingCountsByMpId] = await Promise.all([
    getMarketplaceCategoryDirectProductCounts(),
    getMarketplaceCategoryMappingCounts(),
  ]);
  const allCats = await prisma.marketplaceCategory.findMany({
    select: { id: true, parentId: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const parent = allCats.find((c) => c.slug === slug);
  if (!parent) return [];

  const childrenByParent = new Map<string, string[]>();
  for (const c of allCats) {
    if (c.parentId == null) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }

  const subtreeMemo = new Map<string, number>();
  function subtreeProductCount(id: string): number {
    if (subtreeMemo.has(id)) return subtreeMemo.get(id)!;
    let sum = countsByMarketplaceId.get(id) ?? 0;
    for (const kid of childrenByParent.get(id) ?? []) {
      sum += subtreeProductCount(kid);
    }
    subtreeMemo.set(id, sum);
    return sum;
  }

  return allCats
    .filter(
      (c) =>
        c.parentId === parent.id &&
        (subtreeProductCount(c.id) > 0 || (mappingCountsByMpId.get(c.id) ?? 0) > 0),
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: subtreeProductCount(c.id),
    }));
}

/**
 * Дочерние категории выбранного родителя (по slug) с count > 0 в поддереве,
 * но только по товарам магазинов из `storeIds` (например в радиусе на карте).
 */
export async function getMarketplaceChildCategoriesWithCountsByParentSlugForStoreIds(
  parentSlug: string,
  storeIds: string[],
): Promise<MarketplaceCategoryHomeItem[]> {
  const slug = parentSlug.trim();
  if (!slug) return [];
  const [countsByMarketplaceId, mappingCountsByMpId] = await Promise.all([
    getMarketplaceCategoryDirectProductCounts(storeIds),
    getMarketplaceCategoryMappingCounts(storeIds),
  ]);
  const allCats = await prisma.marketplaceCategory.findMany({
    select: { id: true, parentId: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const parent = allCats.find((c) => c.slug === slug);
  if (!parent) return [];

  const childrenByParent = new Map<string, string[]>();
  for (const c of allCats) {
    if (c.parentId == null) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }

  const subtreeMemo = new Map<string, number>();
  function subtreeProductCount(id: string): number {
    if (subtreeMemo.has(id)) return subtreeMemo.get(id)!;
    let sum = countsByMarketplaceId.get(id) ?? 0;
    for (const kid of childrenByParent.get(id) ?? []) {
      sum += subtreeProductCount(kid);
    }
    subtreeMemo.set(id, sum);
    return sum;
  }

  return allCats
    .filter(
      (c) =>
        c.parentId === parent.id &&
        (subtreeProductCount(c.id) > 0 || (mappingCountsByMpId.get(c.id) ?? 0) > 0),
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: subtreeProductCount(c.id),
    }));
}
