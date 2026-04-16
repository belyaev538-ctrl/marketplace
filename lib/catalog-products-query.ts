import type { Prisma, StoreBusinessType } from "@prisma/client";
import {
  parsePublicFulfillmentFilters,
  storeWhereMatchesFulfillmentFilters,
} from "@/lib/catalog-fulfillment-filter";
import { prisma } from "@/lib/prisma";

/**
 * Все id выбранной marketplace-категории и её потомков (для фильтра товаров).
 */
export async function resolveCatalogCategoryIds(
  categoryId: string | undefined
): Promise<string[]> {
  if (!categoryId) return [];

  const all = await prisma.marketplaceCategory.findMany({
    select: { id: true, parentId: true },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const c of all) {
    if (c.parentId == null) continue;
    const arr = childrenByParent.get(c.parentId) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parentId, arr);
  }

  const out = new Set<string>();
  const stack = [categoryId];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const kids = childrenByParent.get(id) ?? [];
    stack.push(...kids);
  }
  return Array.from(out);
}

/**
 * Условия для публичного показа товара на маркетплейсе (каталог, API, sitemap).
 * slug не пустой; есть хотя бы одно изображение с непустым url; при выборе родительской
 * категории в каталоге categoryIds должны включать всех потомков (см. resolveCatalogCategoryIds).
 * Полнотекстовый поиск — отдельно в product-search-fts (тот же критерий по картинкам).
 */
export function buildCatalogProductWhere(
  storeSlug: string | undefined,
  categoryIds: string[],
  fulfillmentModes: string[] = [],
  storeBusinessTypes: StoreBusinessType[] = [],
) {
  const cleanFulfillment = parsePublicFulfillmentFilters(fulfillmentModes);
  return {
    active: true,
    slug: { not: "" },
    images: {
      some: {
        url: { not: "" },
      },
    },
    store: {
      active: true,
      showProducts: true,
      mappings: { some: {} },
      ...(storeSlug ? { slug: storeSlug } : {}),
      ...(cleanFulfillment.length > 0
        ? storeWhereMatchesFulfillmentFilters(cleanFulfillment)
        : {}),
      ...(storeBusinessTypes.length > 0
        ? { businessTypes: { hasSome: storeBusinessTypes } }
        : {}),
    },
    sourceCategory: {
      ...(categoryIds.length > 0
        ? {
            mappings: {
              some: {
                marketplaceCategoryId: {
                  in: categoryIds,
                },
              },
            },
          }
        : {
            mappings: {
              some: {},
            },
          }),
    },
  };
}

/**
 * Магазины (только `businessTypes`), у которых есть хотя бы один товар,
 * подпадающий под те же правила витрины, что и список в каталоге,
 * но без фильтра по типу магазина — для фасета «Тип магазина» на странице рубрики.
 */
export async function fetchStoresForBusinessTypeFacet(args: {
  storeSlug: string | undefined;
  categoryIds: string[];
  fulfillmentModes: string[];
  storeIdsInRadius?: string[];
}): Promise<{ businessTypes: StoreBusinessType[] }[]> {
  const where = buildCatalogProductWhere(
    args.storeSlug,
    args.categoryIds,
    args.fulfillmentModes,
    [],
  ) as Record<string, unknown>;
  if (Array.isArray(args.storeIdsInRadius)) {
    where.storeId = { in: args.storeIdsInRadius };
  }

  const grouped = await prisma.product.groupBy({
    by: ["storeId"],
    where: where as Prisma.ProductWhereInput,
  });

  const storeIds = grouped.map((g) => g.storeId);
  if (storeIds.length === 0) return [];

  return prisma.store.findMany({
    where: {
      id: { in: storeIds },
      active: true,
      showProducts: true,
    },
    select: { businessTypes: true },
  });
}

/**
 * Магазины, участвующие в каталоге (активны, показывают товары, есть маппинг, есть хотя бы один
 * листинговый товар). Опционально — фильтр по типам бизнеса для списка «Магазин».
 */
export function catalogListableStoreWhere(
  storeBusinessTypes: StoreBusinessType[] = [],
): Prisma.StoreWhereInput {
  return {
    active: true,
    showProducts: true,
    mappings: { some: {} },
    ...(storeBusinessTypes.length > 0
      ? { businessTypes: { hasSome: storeBusinessTypes } }
      : {}),
    products: {
      some: {
        active: true,
        slug: { not: "" },
        images: { some: { url: { not: "" } } },
        sourceCategory: {
          mappings: { some: {} },
        },
      },
    },
  };
}

/**
 * Точки на публичной карте: те же правила, что и витрина каталога, плюс заданные координаты.
 * Не показываем магазины с выключенной витриной или без листинговых товаров.
 */
export function catalogListableStoreWithCoordsWhere(
  storeBusinessTypes: StoreBusinessType[] = [],
): Prisma.StoreWhereInput {
  return {
    ...catalogListableStoreWhere(storeBusinessTypes),
    latitude: { not: null },
    longitude: { not: null },
  };
}

