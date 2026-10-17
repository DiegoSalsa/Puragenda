-- Additive only: no existing tenant, payment, period or operational data is changed.
CREATE TYPE "SubscriptionPaymentMethod" AS ENUM ('AUTOMATIC', 'BANK_TRANSFER');

ALTER TABLE "Subscription"
  ADD COLUMN "staffLimitOverride" INTEGER,
  ADD COLUMN "paymentMethod" "SubscriptionPaymentMethod" NOT NULL DEFAULT 'AUTOMATIC',
  ADD COLUMN "customMonthlyPriceClp" INTEGER,
  ADD CONSTRAINT "Subscription_staffLimitOverride_positive"
    CHECK ("staffLimitOverride" IS NULL OR "staffLimitOverride" > 0),
  ADD CONSTRAINT "Subscription_customMonthlyPriceClp_positive"
    CHECK ("customMonthlyPriceClp" IS NULL OR "customMonthlyPriceClp" > 0),
  ADD CONSTRAINT "Subscription_customMonthlyPriceClp_manual_monthly"
    CHECK ("customMonthlyPriceClp" IS NULL OR ("paymentMethod" = 'BANK_TRANSFER' AND "billingCycle" = 'MONTHLY'));

-- Existing table policies and grants are preserved; no new access is granted.
