-- Пересоздать колонку, если раньше попала «пустая» tsvector без GENERATED (db push)
DROP INDEX IF EXISTS "Product_searchVector_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "searchVector";

ALTER TABLE "Product" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('russian', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");
