-- Keep disposable laboratory operations sealed; runtime rows use distinct tags.
ALTER TABLE "CommercialBillingOperation" DROP CONSTRAINT "CommercialBillingOperation_environment_check";
ALTER TABLE "CommercialBillingOperation" ADD CONSTRAINT "CommercialBillingOperation_environment_check"
  CHECK (environment IN ('SANDBOX','V2_SANDBOX','V2_PRODUCTION'));
ALTER TABLE "CommercialBillingOperation" DROP CONSTRAINT "CommercialBillingOperation_kind_check";
ALTER TABLE "CommercialBillingOperation" ADD CONSTRAINT "CommercialBillingOperation_kind_check"
  CHECK (kind IN ('NEW_SUBSCRIPTION','CONTRACT_CHANGE','CANCEL_RENEWAL'));
ALTER TABLE "CommercialPaymentEvidence" DROP CONSTRAINT "CommercialPaymentEvidence_origin_check";
ALTER TABLE "CommercialPaymentEvidence" ADD CONSTRAINT "CommercialPaymentEvidence_origin_check"
  CHECK (origin IN ('SANDBOX_PROVIDER','CONTRACT_FIXTURE','V2_SANDBOX_PROVIDER','V2_PRODUCTION_PROVIDER'));
-- Cancellation must also be possible while an unpaid checkout/change is open.
DROP INDEX "CommercialBillingOperation_one_open_business";
CREATE UNIQUE INDEX "CommercialBillingOperation_one_open_business" ON "CommercialBillingOperation"("businessId")
  WHERE status IN ('PREPARED','SCHEDULED','EXECUTING','UNKNOWN','AWAITING_PAYMENT','PAID') AND kind <> 'CANCEL_RENEWAL';
ALTER TABLE "CommercialSubscription" DROP CONSTRAINT "CommercialSubscription_cancellation_status_check";
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_cancellation_status_check"
  CHECK ("renewalCancellationStatus" IS NULL OR "renewalCancellationStatus" IN ('REQUESTED','UNKNOWN','CONFIRMED','CANCELLED_VERIFIED','PAUSED'));
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_v2_cancellation_evidence_check"
  CHECK ("renewalCancellationStatus" IS DISTINCT FROM 'CANCELLED_VERIFIED' OR "renewalCancelledAt" IS NOT NULL);
