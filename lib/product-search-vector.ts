import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Пересчёт searchVector из name + description (конфигурация simple, как в миграции).
 * Вызывать после create/update товара в импорте.
 */
export async function refreshProductSearchVector(productId: string): Promise<void> {
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "Product"
      SET "searchVector" = to_tsvector(
        'simple',
        coalesce(name, '') || ' ' || coalesce(description, '')
      )
      WHERE id = ${productId}
    `,
  );
}
