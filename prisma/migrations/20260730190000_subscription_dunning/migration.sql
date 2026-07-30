ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAST_DUE';

ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "paymentFailedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gracePeriodEndsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "nextPaymentAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastInvoiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastInvoiceStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPaymentId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPaymentStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPaymentStatusDetail" TEXT,
  ADD COLUMN IF NOT EXISTS "lastPaymentAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentRetryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "dunningEmailSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "graceExpiryWarningSentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Subscription_status_gracePeriodEndsAt_idx"
  ON "Subscription"("status", "gracePeriodEndsAt");
