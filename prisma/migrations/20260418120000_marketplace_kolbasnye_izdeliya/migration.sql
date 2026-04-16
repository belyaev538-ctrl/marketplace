-- Подкатегория «Колбасные изделия» под корнем «Продукты питания» (идемпотентно).
INSERT INTO "MarketplaceCategory" ("id", "name", "slug", "parentId")
SELECT 'cmpmkolbasnyeizd01', 'Колбасные изделия', 'kolbasnye-izdeliya', p.id
FROM "MarketplaceCategory" p
WHERE p.name = 'Продукты питания'
  AND p."parentId" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "MarketplaceCategory" c
    WHERE c."parentId" = p.id AND c.name = 'Колбасные изделия'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "MarketplaceCategory" s WHERE s.slug = 'kolbasnye-izdeliya'
  )
LIMIT 1;
