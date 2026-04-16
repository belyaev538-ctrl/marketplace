"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { createUniqueMarketplaceCategorySlug } from "@/lib/marketplace-category-slug";
import { prisma } from "@/lib/prisma";

export type CategoryMappingRowInput = {
  sourceCategoryId: string;
  marketplaceCategoryIds: string[];
};

/** Сохранить привязки для всех категорий выгрузки магазина одним запросом (без редиректа). */
export async function saveAllStoreCategoryMappings(
  storeId: string,
  rows: CategoryMappingRowInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Нет доступа" };
  }

  const trimmed = storeId.trim();
  if (!trimmed) {
    return { ok: false, error: "Некорректный магазин" };
  }

  const store = await prisma.store.findUnique({
    where: { id: trimmed },
    select: { id: true },
  });
  if (!store) {
    return { ok: false, error: "Магазин не найден" };
  }

  const sourceIds = Array.from(new Set(rows.map((r) => r.sourceCategoryId)));
  if (sourceIds.length === 0) {
    return { ok: true };
  }

  const foundSources = await prisma.sourceCategory.findMany({
    where: { storeId: trimmed, id: { in: sourceIds } },
    select: { id: true },
  });
  if (foundSources.length !== sourceIds.length) {
    return { ok: false, error: "Часть категорий выгрузки не найдена" };
  }

  const allMpIds = Array.from(new Set(rows.flatMap((r) => r.marketplaceCategoryIds)));
  const validMpRows =
    allMpIds.length > 0
      ? await prisma.marketplaceCategory.findMany({
          where: { id: { in: allMpIds } },
          select: { id: true },
        })
      : [];
  const validMpSet = new Set(validMpRows.map((m) => m.id));

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const unique = Array.from(new Set(row.marketplaceCategoryIds));
        const validIds = unique.filter((id) => validMpSet.has(id));
        await tx.categoryMapping.deleteMany({
          where: { storeId: trimmed, sourceCategoryId: row.sourceCategoryId },
        });
        if (validIds.length > 0) {
          await tx.categoryMapping.createMany({
            data: validIds.map((marketplaceCategoryId) => ({
              storeId: trimmed,
              sourceCategoryId: row.sourceCategoryId,
              marketplaceCategoryId,
            })),
          });
        }
      }
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const base = `/admin/stores/${encodeURIComponent(trimmed)}/categories`;
  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${trimmed}`);
  revalidatePath(base);
  revalidatePath(`/admin/stores/${trimmed}/settings`);
  revalidatePath(`/admin/stores/${trimmed}/products`);

  return { ok: true };
}

/** Создать подкатегорию витрины (2-й уровень) под корневой рубрикой. */
export async function createMarketplaceSubcategory(
  storeId: string,
  parentMarketplaceCategoryId: string,
  name: string,
): Promise<
  | { ok: true; category: { id: string; name: string; slug: string } }
  | { ok: false; error: string }
> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return { ok: false, error: "Нет доступа" };
  }

  const sid = storeId.trim();
  const parentId = parentMarketplaceCategoryId.trim();
  const nameTrim = name.trim();
  if (!sid) return { ok: false, error: "Некорректный магазин" };
  if (!parentId) return { ok: false, error: "Не выбрана родительская рубрика" };
  if (!nameTrim) return { ok: false, error: "Введите название подкатегории" };

  const store = await prisma.store.findUnique({
    where: { id: sid },
    select: { id: true },
  });
  if (!store) {
    return { ok: false, error: "Магазин не найден" };
  }

  const parent = await prisma.marketplaceCategory.findUnique({
    where: { id: parentId },
    select: { id: true, parentId: true },
  });
  if (!parent) {
    return { ok: false, error: "Родительская рубрика не найдена" };
  }
  if (parent.parentId != null) {
    return {
      ok: false,
      error: "Подкатегорию можно добавить только под корневую рубрику (1-й уровень каталога)",
    };
  }

  const slug = await createUniqueMarketplaceCategorySlug(nameTrim);

  let created: { id: string; name: string; slug: string };
  try {
    created = await prisma.marketplaceCategory.create({
      data: {
        name: nameTrim,
        slug,
        parentId: parent.id,
      },
      select: { id: true, name: true, slug: true },
    });
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const base = `/admin/stores/${encodeURIComponent(sid)}/categories`;
  revalidatePath("/catalog");
  revalidatePath("/map/categories");
  revalidatePath(base);
  revalidatePath("/admin/stores");

  return { ok: true, category: created };
}
