-- Loyalty V2 starts recording new stamp activity from this migration forward.
-- Existing Client.currentStamps and LoyaltyCode rows are intentionally preserved;
-- no synthetic historical ledger rows are created.
CREATE TYPE "LoyaltyRewardType" AS ENUM ('PERCENTAGE', 'FIXED', 'FREE_SERVICE', 'CUSTOM');
CREATE TYPE "LoyaltyStampSource" AS ENUM ('APPOINTMENT', 'MANUAL', 'ADJUSTMENT');

ALTER TABLE "Business"
  ADD COLUMN "loyaltyRewardType" "LoyaltyRewardType" NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN "loyaltyRewardServiceId" TEXT,
  ADD COLUMN "loyaltyRewardExpirationDays" INTEGER;

UPDATE "Business"
SET "loyaltyRewardType" = CASE
  WHEN "discountType" = 'FIXED' THEN 'FIXED'::"LoyaltyRewardType"
  ELSE 'PERCENTAGE'::"LoyaltyRewardType"
END;

ALTER TABLE "Business"
  ADD CONSTRAINT "Business_loyaltyRewardExpirationDays_check"
  CHECK ("loyaltyRewardExpirationDays" IS NULL OR "loyaltyRewardExpirationDays" IN (30, 60, 90)),
  ADD CONSTRAINT "Business_loyaltyRewardServiceId_fkey"
  FOREIGN KEY ("loyaltyRewardServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoyaltyCode"
  ALTER COLUMN "discountValue" DROP NOT NULL,
  ADD COLUMN "rewardType" "LoyaltyRewardType" NOT NULL DEFAULT 'PERCENTAGE',
  ADD COLUMN "freeServiceId" TEXT,
  ADD COLUMN "usedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "redeemedAppointmentId" TEXT;

UPDATE "LoyaltyCode"
SET "rewardType" = CASE
  WHEN "discountType" = 'FIXED' THEN 'FIXED'::"LoyaltyRewardType"
  ELSE 'PERCENTAGE'::"LoyaltyRewardType"
END;

CREATE UNIQUE INDEX "LoyaltyCode_redeemedAppointmentId_key" ON "LoyaltyCode"("redeemedAppointmentId");
CREATE INDEX "LoyaltyCode_businessId_isUsed_expiresAt_idx" ON "LoyaltyCode"("businessId", "isUsed", "expiresAt");

ALTER TABLE "LoyaltyCode"
  ADD CONSTRAINT "LoyaltyCode_freeServiceId_fkey"
  FOREIGN KEY ("freeServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "LoyaltyCode_redeemedAppointmentId_fkey"
  FOREIGN KEY ("redeemedAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LoyaltyStampEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "delta" INTEGER NOT NULL,
  "source" "LoyaltyStampSource" NOT NULL,
  "reason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyStampEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LoyaltyStampEvent_delta_check" CHECK ("delta" <> 0),
  CONSTRAINT "LoyaltyStampEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyStampEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyStampEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LoyaltyStampEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LoyaltyStampEvent_appointmentId_key" ON "LoyaltyStampEvent"("appointmentId");
CREATE INDEX "LoyaltyStampEvent_businessId_createdAt_idx" ON "LoyaltyStampEvent"("businessId", "createdAt");
CREATE INDEX "LoyaltyStampEvent_clientId_createdAt_idx" ON "LoyaltyStampEvent"("clientId", "createdAt");
CREATE INDEX "LoyaltyStampEvent_createdById_idx" ON "LoyaltyStampEvent"("createdById");

-- The public schema is exposed by Supabase. Loyalty data is server-only, so it
-- gets defense-in-depth RLS and no Data API privileges for browser roles.
ALTER TABLE public."LoyaltyStampEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."LoyaltyStampEvent" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."LoyaltyStampEvent" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."LoyaltyStampEvent" FROM authenticated;
  END IF;
END
$$;
