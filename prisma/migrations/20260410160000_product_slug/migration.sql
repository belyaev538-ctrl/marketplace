-- Уникальный slug для страницы товара; существующие строки: slug = id
ALTER TABLE "Product" ADD COLUMN "slug" TEXT;

UPDATE "Product" SET "slug" = "id" WHERE "slug" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Product_slug_key" ON "Product" ("slug");
