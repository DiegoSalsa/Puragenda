CREATE TYPE "WebsitePriceTier" AS ENUM ('STANDARD', 'BETA_FOUNDER');

CREATE TABLE "WebsiteLaunchSnapshot" (
  "id" TEXT NOT NULL,
  "launchAt" TIMESTAMP(3) NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "memberCount" INTEGER NOT NULL,
  CONSTRAINT "WebsiteLaunchSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebsiteLaunchSnapshot_launchAt_key" ON "WebsiteLaunchSnapshot"("launchAt");

CREATE TABLE "WebsiteOfferEligibility" (
  "businessId" TEXT NOT NULL,
  "offerCode" "WebsitePriceTier" NOT NULL DEFAULT 'BETA_FOUNDER',
  "snapshotId" TEXT NOT NULL,
  "eligibleAt" TIMESTAMP(3) NOT NULL,
  "trialStartedAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "trialConsumedAt" TIMESTAMP(3),
  CONSTRAINT "WebsiteOfferEligibility_pkey" PRIMARY KEY ("businessId")
);
CREATE TABLE "WebsiteCommercialEvent" (
  "key" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "priceTier" "WebsitePriceTier" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteCommercialEvent_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "WebsiteCommercialEvent_event_occurredAt_idx" ON "WebsiteCommercialEvent"("event", "occurredAt");
ALTER TABLE "WebsiteLaunchSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteOfferEligibility" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteCommercialEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteOfferEligibility" ADD CONSTRAINT "WebsiteOfferEligibility_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteOfferEligibility" ADD CONSTRAINT "WebsiteOfferEligibility_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WebsiteLaunchSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WebsiteCommercialEvent" ADD CONSTRAINT "WebsiteCommercialEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "WebsiteLaunchSnapshot", "WebsiteOfferEligibility", "WebsiteCommercialEvent" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "WebsiteLaunchSnapshot", "WebsiteOfferEligibility", "WebsiteCommercialEvent" FROM authenticated;
  END IF;
END $$;
