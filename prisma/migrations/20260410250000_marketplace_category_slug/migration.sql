-- AlterTable: уникальный slug; существующие строки получают стабильный slug по id до пересидирования/ручного обновления
ALTER TABLE "MarketplaceCategory" ADD COLUMN "slug" TEXT;

UPDATE "MarketplaceCategory" SET "slug" = 'mc-' || "id" WHERE "slug" IS NULL;

ALTER TABLE "MarketplaceCategory" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON "MarketplaceCategory"("slug");
