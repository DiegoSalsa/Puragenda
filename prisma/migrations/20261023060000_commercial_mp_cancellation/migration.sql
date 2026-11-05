-- Additive sandbox lifecycle state; legacy Subscription is untouched.
ALTER TABLE "CommercialSubscription"
  ADD COLUMN "renewalCancellationStatus" TEXT,
  ADD COLUMN "renewalCancellationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "renewalCancelledAt" TIMESTAMP(3),
  ADD CONSTRAINT "CommercialSubscription_cancellation_status_check"
    CHECK ("renewalCancellationStatus" IS NULL OR "renewalCancellationStatus" IN ('REQUESTED','UNKNOWN','CONFIRMED')),
  ADD CONSTRAINT "CommercialSubscription_cancellation_evidence_check"
    CHECK ("renewalCancellationStatus" IS DISTINCT FROM 'CONFIRMED' OR "renewalCancelledAt" IS NOT NULL);
