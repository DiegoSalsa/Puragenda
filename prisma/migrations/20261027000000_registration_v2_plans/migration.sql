-- Existing subscriptions retain their original plan and agreed price.
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'PURAGENDA';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'PURAGENDA_PLUS';

-- Annual quotes are now defined for new registrations. Existing monthly-only
-- provider fixtures retain the original check unless annual terms are explicit.
ALTER TABLE "CommercialSubscription" DROP CONSTRAINT "CommercialSubscription_v2_monthly_check";
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_v2_monthly_check" CHECK (
  "planCode" IN ('INDIVIDUAL', 'EQUIPO', 'TEST') OR "billingCycle" = 'MONTHLY' OR (
    "billingCycle" = 'ANNUAL'
    AND COALESCE("termsSnapshot"->>'origin', '') = 'registration_v2'
    AND COALESCE("termsSnapshot"->>'annualPaidMonths', '') = '10'
    AND COALESCE("termsSnapshot"->>'annualFreeMonths', '') = '2'
  )
);
