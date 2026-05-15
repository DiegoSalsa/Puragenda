-- Add depositAmount to Service (per-service deposit config)
ALTER TABLE "Service" ADD COLUMN "depositAmount" INTEGER NOT NULL DEFAULT 0;

-- Copy existing business-level depositAmount to all services of that business
UPDATE "Service" s
SET "depositAmount" = b."depositAmount"
FROM "Business" b
WHERE s."businessId" = b."id"
  AND b."depositAmount" > 0;

-- Remove depositAmount from Business (no longer global)
ALTER TABLE "Business" DROP COLUMN IF EXISTS "depositAmount";
