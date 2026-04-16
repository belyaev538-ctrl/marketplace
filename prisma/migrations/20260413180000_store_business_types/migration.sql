-- CreateEnum
CREATE TYPE "StoreBusinessType" AS ENUM (
  'grocery',
  'construction',
  'pet',
  'pharmacy',
  'electronics',
  'clothing',
  'home',
  'kids',
  'beauty',
  'auto',
  'services',
  'other'
);

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "businessTypes" "StoreBusinessType"[] DEFAULT ARRAY[]::"StoreBusinessType"[];
