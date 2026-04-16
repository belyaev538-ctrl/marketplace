-- Store fulfillment: one value -> multiple values
ALTER TABLE "Store"
  ADD COLUMN IF NOT EXISTS "fulfillmentModes" "StoreFulfillmentMode"[] NOT NULL
  DEFAULT ARRAY['delivery']::"StoreFulfillmentMode"[];

UPDATE "Store"
SET "fulfillmentModes" = CASE "fulfillmentMode"
  WHEN 'delivery' THEN ARRAY['delivery']::"StoreFulfillmentMode"[]
  WHEN 'pickup' THEN ARRAY['pickup']::"StoreFulfillmentMode"[]
  WHEN 'offline' THEN ARRAY['offline']::"StoreFulfillmentMode"[]
  WHEN 'both' THEN ARRAY['delivery','pickup']::"StoreFulfillmentMode"[]
  ELSE ARRAY['delivery']::"StoreFulfillmentMode"[]
END
WHERE "fulfillmentMode" IS NOT NULL;

ALTER TABLE "Store" DROP COLUMN IF EXISTS "fulfillmentMode";
