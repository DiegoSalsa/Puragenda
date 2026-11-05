-- A confirmed one-off upgrade for a manually billed base has a payment and
-- checkout operation, but deliberately creates no recurring provider agreement.
ALTER TABLE "CommercialPaymentEvidence" ALTER COLUMN "providerSubscriptionId" DROP NOT NULL;
