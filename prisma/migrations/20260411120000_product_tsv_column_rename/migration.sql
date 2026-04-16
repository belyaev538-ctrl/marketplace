-- Колонка полнотекста: имя tsv (tsvector, GENERATED + GIN как раньше)
DROP INDEX IF EXISTS "Product_searchVector_idx";
ALTER TABLE "Product" RENAME COLUMN "searchVector" TO "tsv";
CREATE INDEX "Product_tsv_idx" ON "Product" USING GIN ("tsv");
