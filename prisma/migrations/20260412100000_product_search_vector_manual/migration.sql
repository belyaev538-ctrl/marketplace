-- Полнотекстовый поиск: обычная колонка searchVector + GIN (без GENERATED), конфигурация 'simple'
DROP INDEX IF EXISTS "Product_tsv_idx";
DROP INDEX IF EXISTS "Product_searchVector_idx";
DROP INDEX IF EXISTS "product_search_idx";

ALTER TABLE "Product" DROP COLUMN IF EXISTS "tsv";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "searchVector";

ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector;

UPDATE "Product"
SET "searchVector" = to_tsvector(
  'simple',
  coalesce(name, '') || ' ' || coalesce(description, '')
);

CREATE INDEX product_search_idx ON "Product" USING GIN ("searchVector");
