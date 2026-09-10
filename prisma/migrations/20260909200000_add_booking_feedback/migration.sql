-- CreateEnum
CREATE TYPE "BookingFeedbackRating" AS ENUM ('POSITIVE', 'IMPROVE');

-- CreateTable
CREATE TABLE "BookingFeedback" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "rating" "BookingFeedbackRating" NOT NULL,
  "comment" TEXT,
  "googleReviewClickedAt" TIMESTAMP(3),
  "clientPortalAccountId" TEXT,
  "authenticated" BOOLEAN NOT NULL DEFAULT false,
  "deviceType" TEXT,
  "locale" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingFeedback_appointmentId_key" ON "BookingFeedback"("appointmentId");
CREATE INDEX "BookingFeedback_businessId_idx" ON "BookingFeedback"("businessId");
CREATE INDEX "BookingFeedback_createdAt_idx" ON "BookingFeedback"("createdAt");
CREATE INDEX "BookingFeedback_rating_idx" ON "BookingFeedback"("rating");
CREATE INDEX "BookingFeedback_googleReviewClickedAt_idx" ON "BookingFeedback"("googleReviewClickedAt");
CREATE INDEX "BookingFeedback_clientPortalAccountId_idx" ON "BookingFeedback"("clientPortalAccountId");

ALTER TABLE "BookingFeedback" ADD CONSTRAINT "BookingFeedback_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingFeedback" ADD CONSTRAINT "BookingFeedback_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingFeedback" ADD CONSTRAINT "BookingFeedback_clientPortalAccountId_fkey" FOREIGN KEY ("clientPortalAccountId") REFERENCES "ClientPortalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Internal product feedback is server-only. The public schema is exposed by
-- Supabase, so browser roles receive no privileges and RLS stays on as defense in depth.
ALTER TABLE public."BookingFeedback" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."BookingFeedback" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."BookingFeedback" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."BookingFeedback" FROM authenticated;
  END IF;
END
$$;
