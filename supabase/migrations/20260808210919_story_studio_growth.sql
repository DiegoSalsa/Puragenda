ALTER TABLE "StoryCampaign"
  ADD COLUMN "copiedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "objective" TEXT NOT NULL DEFAULT 'FILL_SLOTS',
  ADD COLUMN "configuration" JSONB,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "StoryCampaign"
SET "publishedAt" = "createdAt"
WHERE "publishedAt" IS NULL;

ALTER TABLE "StoryCampaign"
  ADD CONSTRAINT "StoryCampaign_status_check"
  CHECK ("status" IN ('PUBLISHED', 'ARCHIVED')),
  ADD CONSTRAINT "StoryCampaign_objective_check"
  CHECK ("objective" IN ('FILL_SLOTS', 'LAST_MINUTE', 'PROMOTE_SERVICE', 'CANCELLATION'));

CREATE INDEX "StoryCampaign_businessId_status_createdAt_idx"
  ON "StoryCampaign"("businessId", "status", "createdAt");

CREATE TABLE "StoryPreset" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "name" TEXT NOT NULL,
  "configuration" JSONB NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StoryPreset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StoryPreset_businessId_name_key" UNIQUE ("businessId", "name"),
  CONSTRAINT "StoryPreset_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StoryPreset_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "StoryPreset_businessId_isDefault_updatedAt_idx"
  ON "StoryPreset"("businessId", "isDefault", "updatedAt");

CREATE INDEX "StoryPreset_createdByUserId_idx"
  ON "StoryPreset"("createdByUserId");

ALTER TABLE public."StoryPreset" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."StoryPreset" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."StoryPreset" FROM authenticated;
  END IF;
END
$$;
