import { prisma } from "@/lib/prisma";

/** Для автозаполнения slug в форме (без проверки уникальности). */
export function slugifyStoreNameInput(name: string): string {
  return slugifyStoreBase(name);
}

function slugifyStoreBase(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base.length > 0 ? base.slice(0, 80) : "store";
}

export type CreateUniqueStoreSlugOptions = {
  excludeStoreId?: string;
};

/** Уникальный slug магазина (как у товаров: латиница и цифры). */
export async function createUniqueStoreSlug(
  name: string,
  opts?: CreateUniqueStoreSlugOptions
): Promise<string> {
  const base = slugifyStoreBase(name);
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    const taken = await prisma.store.findFirst({
      where: {
        slug: candidate,
        ...(opts?.excludeStoreId
          ? { NOT: { id: opts.excludeStoreId } }
          : {}),
      },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}
