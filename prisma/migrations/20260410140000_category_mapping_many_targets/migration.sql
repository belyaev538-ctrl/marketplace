-- Несколько marketplace-категорий на одну source-категорию в рамках магазина
ALTER TABLE "CategoryMapping" DROP CONSTRAINT IF EXISTS "CategoryMapping_storeId_sourceCategoryId_key";

DROP INDEX IF EXISTS "CategoryMapping_storeId_sourceCategoryId_key";

CREATE UNIQUE INDEX "CategoryMapping_storeId_sourceCategoryId_marketplaceCategoryId_key"
  ON "CategoryMapping" ("storeId", "sourceCategoryId", "marketplaceCategoryId");
