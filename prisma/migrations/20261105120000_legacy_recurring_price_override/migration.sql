-- Allows an explicitly approved automatic legacy contract to retain a
-- recurring price below the catalogue tariff without changing its plan.
ALTER TABLE "Subscription"
  ADD COLUMN "recurringPriceOverrideClp" INTEGER,
  ADD CONSTRAINT "Subscription_recurringPriceOverrideClp_positive_monthly_automatic"
    CHECK (
      "recurringPriceOverrideClp" IS NULL OR (
        "recurringPriceOverrideClp" > 0
        AND "paymentMethod" = 'AUTOMATIC'
        AND "billingCycle" = 'MONTHLY'
        AND "plan" IN ('INDIVIDUAL', 'EQUIPO', 'TEST')
      )
    );
