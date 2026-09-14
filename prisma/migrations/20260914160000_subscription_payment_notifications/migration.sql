-- Durable claim ledger for one admin notification per confirmed provider payment.
CREATE TYPE "SubscriptionPaymentNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "SubscriptionPaymentNotification" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "status" "SubscriptionPaymentNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPaymentNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPaymentNotification_provider_paymentId_key"
    ON "SubscriptionPaymentNotification"("provider", "paymentId");
CREATE INDEX "SubscriptionPaymentNotification_subscriptionId_idx"
    ON "SubscriptionPaymentNotification"("subscriptionId");
CREATE INDEX "SubscriptionPaymentNotification_status_failedAt_idx"
    ON "SubscriptionPaymentNotification"("status", "failedAt");

ALTER TABLE "SubscriptionPaymentNotification"
    ADD CONSTRAINT "SubscriptionPaymentNotification_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Internal server-only data: keep it inaccessible through Supabase's exposed
-- public schema and retain RLS as defense in depth.
ALTER TABLE public."SubscriptionPaymentNotification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."SubscriptionPaymentNotification" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."SubscriptionPaymentNotification" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."SubscriptionPaymentNotification" FROM authenticated;
  END IF;
END
$$;
