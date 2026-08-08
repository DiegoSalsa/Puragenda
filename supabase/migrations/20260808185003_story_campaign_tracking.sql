CREATE TABLE "StoryCampaign" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "locationId" TEXT,
  "staffId" TEXT,
  "serviceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "range" TEXT NOT NULL,
  "targetDate" DATE,
  "headline" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "destinationUrl" TEXT NOT NULL,
  "slotCount" INTEGER NOT NULL DEFAULT 0,
  "potentialRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "linkVisits" INTEGER NOT NULL DEFAULT 0,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "shareCount" INTEGER NOT NULL DEFAULT 0,
  "lastVisitedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StoryCampaign_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Appointment"
  ADD COLUMN "storyCampaignId" TEXT;

CREATE UNIQUE INDEX "StoryCampaign_token_key"
  ON "StoryCampaign"("token");

CREATE INDEX "StoryCampaign_businessId_createdAt_idx"
  ON "StoryCampaign"("businessId", "createdAt");

CREATE INDEX "StoryCampaign_locationId_idx"
  ON "StoryCampaign"("locationId");

CREATE INDEX "StoryCampaign_staffId_idx"
  ON "StoryCampaign"("staffId");

CREATE INDEX "Appointment_storyCampaignId_idx"
  ON "Appointment"("storyCampaignId");

ALTER TABLE "StoryCampaign"
  ADD CONSTRAINT "StoryCampaign_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryCampaign"
  ADD CONSTRAINT "StoryCampaign_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoryCampaign"
  ADD CONSTRAINT "StoryCampaign_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StoryCampaign"
  ADD CONSTRAINT "StoryCampaign_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_storyCampaignId_fkey"
  FOREIGN KEY ("storyCampaignId") REFERENCES "StoryCampaign"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Story campaign analytics are only accessed by server-side Prisma code.
-- Keep the table closed to the public Supabase Data API.
ALTER TABLE public."StoryCampaign" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."StoryCampaign" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."StoryCampaign" FROM authenticated;
  END IF;
END
$$;
