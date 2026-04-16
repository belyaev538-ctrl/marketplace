-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('pending', 'processing', 'success', 'failed');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('xml', 'cabinet', 'mixed');

-- AlterEnum (новое значение для формата работы)
ALTER TYPE "StoreFulfillmentMode" ADD VALUE 'offline';

-- AlterTable: XML и fallback необязательны (кабинет / смешанный тип)
ALTER TABLE "Store" ALTER COLUMN "xmlUrl" DROP NOT NULL;
ALTER TABLE "Store" ALTER COLUMN "fallbackUrl" DROP NOT NULL;

-- User.storeId (мог отсутствовать в старых миграциях)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "storeId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_storeId_key" ON "User"("storeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_storeId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Новые поля Store (IF NOT EXISTS — безопасно при частичном дрейфе схемы)
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "fullDescription" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "vkUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "telegramUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "whatsappUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "otherMessengerUrl" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "workingHours" JSONB;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "lastImportAt" TIMESTAMP(3);
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "lastImportError" TEXT;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "showProducts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "autoImport" BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Store' AND column_name = 'storeType'
  ) THEN
    ALTER TABLE "Store" ADD COLUMN "storeType" "StoreType" NOT NULL DEFAULT 'xml';
  END IF;
END $$;

-- lastImportStatus: TEXT → enum ImportStatus или создание колонки
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'Store'
      AND c.column_name = 'lastImportStatus'
      AND c.data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE "Store" ADD COLUMN "lastImportStatus_enum" "ImportStatus";
    UPDATE "Store" SET "lastImportStatus_enum" = CASE
      WHEN "lastImportStatus" IS NULL THEN NULL
      WHEN lower(trim("lastImportStatus"::text)) IN ('success', 'succeeded') THEN 'success'::"ImportStatus"
      WHEN lower(trim("lastImportStatus"::text)) IN ('failed', 'error', 'timeout') THEN 'failed'::"ImportStatus"
      WHEN lower(trim("lastImportStatus"::text)) = 'pending' THEN 'pending'::"ImportStatus"
      WHEN lower(trim("lastImportStatus"::text)) = 'processing' THEN 'processing'::"ImportStatus"
      ELSE NULL
    END;
    ALTER TABLE "Store" DROP COLUMN "lastImportStatus";
    ALTER TABLE "Store" RENAME COLUMN "lastImportStatus_enum" TO "lastImportStatus";
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Store' AND column_name = 'lastImportStatus'
  ) THEN
    ALTER TABLE "Store" ADD COLUMN "lastImportStatus" "ImportStatus";
  END IF;
END $$;
