-- Verified appointment reviews (business reputation). Distinct from BookingFeedback
-- (internal product NPS). Existing private feedback is never converted to public.

CREATE TYPE "ReviewVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "ReviewModerationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REPORTED', 'REMOVED');
CREATE TYPE "ReviewReportReason" AS ENUM (
  'INSULTS',
  'THREATS',
  'PERSONAL_DATA',
  'SPAM',
  'SEXUAL_CONTENT',
  'DISCRIMINATION',
  'NOT_ABOUT_SERVICE',
  'EXTORTION',
  'OTHER'
);
CREATE TYPE "ReviewModerationOutcome" AS ENUM ('APPROVED', 'REMOVED', 'KEPT_PRIVATE');
CREATE TYPE "ReviewVerificationSource" AS ENUM ('BOOKING_TOKEN', 'CLIENT_PORTAL');

ALTER TABLE "Business"
  ADD COLUMN "publicReviewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "publicReviewRatingSum" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Appointment"
  ADD COLUMN "reviewInviteSentAt" TIMESTAMP(3),
  ADD COLUMN "reviewInviteCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Appointment_status_endTime_reviewInviteSentAt_idx"
  ON "Appointment"("status", "endTime", "reviewInviteSentAt");

CREATE TABLE "AppointmentReview" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "clientId" TEXT,
  "clientPortalAccountId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "visibility" "ReviewVisibility" NOT NULL,
  "status" "ReviewModerationStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "autoPublishAt" TIMESTAMP(3),
  "publicReviewerName" TEXT NOT NULL,
  "serviceNameSnapshot" TEXT,
  "staffNameSnapshot" TEXT,
  "businessReply" TEXT,
  "businessRepliedAt" TIMESTAMP(3),
  "businessRepliedByUserId" TEXT,
  "reportReason" "ReviewReportReason",
  "reportDetails" TEXT,
  "reportedAt" TIMESTAMP(3),
  "reportedByUserId" TEXT,
  "moderatedAt" TIMESTAMP(3),
  "moderatedByUserId" TEXT,
  "moderationOutcome" "ReviewModerationOutcome",
  "moderationNotes" TEXT,
  "verificationSource" "ReviewVerificationSource" NOT NULL,
  "withdrawnAt" TIMESTAMP(3),
  "lastCustomerEditAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppointmentReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppointmentReview_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5),
  CONSTRAINT "AppointmentReview_public_published_check" CHECK (
    NOT ("visibility" = 'PRIVATE' AND "status" = 'PUBLISHED')
  )
);

CREATE UNIQUE INDEX "AppointmentReview_appointmentId_key" ON "AppointmentReview"("appointmentId");
CREATE INDEX "AppointmentReview_businessId_visibility_status_publishedAt_idx"
  ON "AppointmentReview"("businessId", "visibility", "status", "publishedAt");
CREATE INDEX "AppointmentReview_businessId_status_autoPublishAt_idx"
  ON "AppointmentReview"("businessId", "status", "autoPublishAt");
CREATE INDEX "AppointmentReview_status_visibility_autoPublishAt_idx"
  ON "AppointmentReview"("status", "visibility", "autoPublishAt");
CREATE INDEX "AppointmentReview_businessId_withdrawnAt_idx"
  ON "AppointmentReview"("businessId", "withdrawnAt");
CREATE INDEX "AppointmentReview_clientId_idx" ON "AppointmentReview"("clientId");
CREATE INDEX "AppointmentReview_clientPortalAccountId_idx" ON "AppointmentReview"("clientPortalAccountId");
CREATE INDEX "AppointmentReview_reportedAt_idx" ON "AppointmentReview"("reportedAt");

ALTER TABLE "AppointmentReview"
  ADD CONSTRAINT "AppointmentReview_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentReview"
  ADD CONSTRAINT "AppointmentReview_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppointmentReview"
  ADD CONSTRAINT "AppointmentReview_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentReview"
  ADD CONSTRAINT "AppointmentReview_clientPortalAccountId_fkey"
  FOREIGN KEY ("clientPortalAccountId") REFERENCES "ClientPortalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentReview"
  ADD CONSTRAINT "AppointmentReview_businessRepliedByUserId_fkey"
  FOREIGN KEY ("businessRepliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentReview"
  ADD CONSTRAINT "AppointmentReview_reportedByUserId_fkey"
  FOREIGN KEY ("reportedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppointmentReview"
  ADD CONSTRAINT "AppointmentReview_moderatedByUserId_fkey"
  FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Server-only table. Public schema is exposed by Supabase, so browser roles
-- receive no privileges and RLS stays on as defense in depth.
ALTER TABLE public."AppointmentReview" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AppointmentReview" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."AppointmentReview" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."AppointmentReview" FROM authenticated;
  END IF;
END
$$;
