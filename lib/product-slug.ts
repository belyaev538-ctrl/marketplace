import { prisma } from "@/lib/prisma";
import { slugifyMarketplaceCategoryName } from "@/lib/marketplace-category-slug";

/** Транслит с русского как у рубрик каталога; латиница в названии сохраняется. */
function slugifyName(name: string): string {
  const raw = name.trim();
  if (!raw) return "tovar";
  const s = slugifyMarketplaceCategoryName(raw);
  if (s === "category") return "tovar";
  return s.slice(0, 80) || "tovar";
}

/** Нужно ли пересобрать slug (старые product / product-N / пусто). */
export function shouldRegenerateProductSlug(slug: string | null | undefined): boolean {
  const s = (slug ?? "").trim();
  if (!s) return true;
  if (/^product$|^product-[0-9]+$/.test(s)) return true;
  if (/^product-[0-9]{10,20}$/.test(s)) return true;
  return false;
}

export type CreateUniqueProductSlugOptions = {
  /** Не считать занятым slug у этого товара (для пересчёта slug из name). */
  excludeProductId?: string;
};

/** Уникальный slug для товара (глобально по таблице). */
export async function createUniqueProductSlug(
  name: string,
  opts?: CreateUniqueProductSlugOptions
): Promise<string> {
  const base = slugifyName(name).slice(0, 80);
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    const taken = await prisma.product.findFirst({
      where: {
        slug: candidate,
        ...(opts?.excludeProductId
          ? { NOT: { id: opts.excludeProductId } }
          : {}),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** Проставить slug из названия только там, где старый шаблон «product-…» / пусто — не ломаем уже нормальные URL. */
export async function backfillProductSlugsFromNames(): Promise<number> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });
  let updated = 0;
  for (const p of products) {
    if (!shouldRegenerateProductSlug(p.slug)) continue;
    const slug = await createUniqueProductSlug(p.name, {
      excludeProductId: p.id,
    });
    await prisma.product.update({
      where: { id: p.id },
      data: { slug },
    });
    updated += 1;
  }
  return updated;
}
