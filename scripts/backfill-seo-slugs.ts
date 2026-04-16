/**
 * Одноразовая миграция данных (запуск вручную):
 *   npx tsx scripts/backfill-seo-slugs.ts
 *
 * 1) MarketplaceCategory: slug вида `mc-{id}` → транслит из name + уникальность.
 * 2) Product: slug только для «уродливых» шаблонов (см. shouldRegenerateProductSlug).
 */
import { PrismaClient } from "@prisma/client";
import { createUniqueMarketplaceCategorySlug } from "../lib/marketplace-category-slug";
import { backfillProductSlugsFromNames } from "../lib/product-slug";

const prisma = new PrismaClient();

async function main() {
  const legacyCats = await prisma.marketplaceCategory.findMany({
    where: { slug: { startsWith: "mc-" } },
    select: { id: true, name: true, slug: true },
  });

  for (const c of legacyCats) {
    const slug = await createUniqueMarketplaceCategorySlug(c.name, {
      excludeCategoryId: c.id,
    });
    await prisma.marketplaceCategory.update({
      where: { id: c.id },
      data: { slug },
    });
    console.log(`Category ${c.id}: ${c.slug} → ${slug}`);
  }

  const n = await backfillProductSlugsFromNames();
  console.log(`Product slugs updated (where needed): ${n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
