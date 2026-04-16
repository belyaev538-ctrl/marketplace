-- CreateEnum
CREATE TYPE "StoreFulfillmentMode" AS ENUM ('delivery', 'pickup', 'both');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "fulfillmentMode" "StoreFulfillmentMode" NOT NULL DEFAULT 'both';
