-- Tracking records can be retained for a documented legal hold.
ALTER TABLE "TrackingEvent" ADD COLUMN "retentionHoldUntil" TIMESTAMP(3);
ALTER TABLE "TrackingConsent" ADD COLUMN "retentionHoldUntil" TIMESTAMP(3);

ALTER TABLE "PrivacyRequest"
  ADD COLUMN "acknowledgementSentAt" TIMESTAMP(3),
  ADD COLUMN "acknowledgementError" TEXT,
  ADD COLUMN "adminNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "technicalAction" TEXT,
  ADD COLUMN "technicalActionAt" TIMESTAMP(3),
  ADD COLUMN "technicalActionByUserId" TEXT,
  ADD COLUMN "technicalActionEvidence" TEXT,
  ADD COLUMN "exportGeneratedAt" TIMESTAMP(3);

CREATE TABLE "PrivacyRestriction" (
  "id" TEXT NOT NULL,
  "emailHash" TEXT,
  "visitorId" TEXT,
  "userId" TEXT,
  "scope" TEXT NOT NULL DEFAULT 'ANALYTICS',
  "reason" TEXT NOT NULL,
  "sourceRequestId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrivacyRestriction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PrivacyRestriction_sourceRequestId_key" ON "PrivacyRestriction"("sourceRequestId");
CREATE INDEX "PrivacyRestriction_emailHash_active_idx" ON "PrivacyRestriction"("emailHash", "active");
CREATE INDEX "PrivacyRestriction_visitorId_active_idx" ON "PrivacyRestriction"("visitorId", "active");
CREATE INDEX "PrivacyRestriction_userId_active_idx" ON "PrivacyRestriction"("userId", "active");

CREATE TABLE "ApiRateLimitBucket" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApiRateLimitBucket_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "ApiRateLimitBucket_resetAt_idx" ON "ApiRateLimitBucket"("resetAt");

-- These tables are server-only. RLS is defense in depth; revoking Data API
-- roles avoids depending on policy mistakes or legacy default grants.
ALTER TABLE "TrackingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrackingConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrivacyRestriction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiRateLimitBucket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "TrackingEvent", "TrackingConsent", "PrivacyRequest", "PrivacyRestriction", "ApiRateLimitBucket" FROM anon, authenticated;
