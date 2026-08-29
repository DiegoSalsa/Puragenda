-- Add consent evidence and a controlled queue for statutory privacy requests.
ALTER TABLE "TrackingEvent"
  ADD COLUMN "consentVersion" TEXT,
  ADD COLUMN "consentGrantedAt" TIMESTAMP(3);

CREATE TABLE "TrackingConsent" (
    "id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrackingConsent_occurredAt_idx" ON "TrackingConsent"("occurredAt");
CREATE INDEX "TrackingConsent_visitorId_occurredAt_idx" ON "TrackingConsent"("visitorId", "occurredAt");
CREATE INDEX "TrackingConsent_userId_occurredAt_idx" ON "TrackingConsent"("userId", "occurredAt");
ALTER TABLE "TrackingConsent"
  ADD CONSTRAINT "TrackingConsent_decision_check" CHECK ("decision" IN ('accepted', 'rejected'));

CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "identityStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "responseSentAt" TIMESTAMP(3),
    "responseChannel" TEXT,
    "responseContent" TEXT,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyRequest_status_dueAt_idx" ON "PrivacyRequest"("status", "dueAt");
CREATE INDEX "PrivacyRequest_email_createdAt_idx" ON "PrivacyRequest"("email", "createdAt");
CREATE INDEX "PrivacyRequest_visitorId_createdAt_idx" ON "PrivacyRequest"("visitorId", "createdAt");
ALTER TABLE "PrivacyRequest"
  ADD CONSTRAINT "PrivacyRequest_requestType_check" CHECK ("requestType" IN ('ACCESS', 'RECTIFICATION', 'SUPPRESSION', 'OPPOSITION', 'PORTABILITY', 'BLOCKING')),
  ADD CONSTRAINT "PrivacyRequest_status_check" CHECK ("status" IN ('RECEIVED', 'IN_REVIEW', 'FULFILLED', 'DENIED')),
  ADD CONSTRAINT "PrivacyRequest_identityStatus_check" CHECK ("identityStatus" IN ('PENDING', 'VERIFIED'));

-- These tables are server-only. RLS prevents accidental access through Supabase's
-- exposed public schema; Prisma's server connection remains the controlled path.
ALTER TABLE "TrackingEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrackingConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrivacyRequest" ENABLE ROW LEVEL SECURITY;
