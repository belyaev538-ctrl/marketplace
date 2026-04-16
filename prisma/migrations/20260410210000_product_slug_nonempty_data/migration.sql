-- Защита: пустой slug ломает URL /product/[slug]
UPDATE "Product" SET "slug" = "id" WHERE "slug" IS NULL OR trim("slug") = '';
