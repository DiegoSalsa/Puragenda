-- CreateTable
CREATE TABLE "CommercialBillingOperation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "seatChangeRequestId" TEXT,
    "provider" "CommercialBillingProvider" NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'SANDBOX',
    "kind" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARED',
    "idempotencyKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "previousContractHash" TEXT NOT NULL,
    "targetPlanCode" TEXT NOT NULL,
    "targetProfessionalTotal" INTEGER NOT NULL,
    "quoteSnapshot" JSONB NOT NULL,
    "providerPreview" JSONB,
    "recurringAmountMinor" INTEGER NOT NULL,
    "expectedPaymentMinor" INTEGER,
    "taxAmountMinor" INTEGER,
    "currencyCode" TEXT NOT NULL DEFAULT 'CLP',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "providerSubscriptionId" TEXT,
    "providerOperationId" TEXT,
    "executionStartedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialBillingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialPaymentEvidence" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "provider" "CommercialBillingProvider" NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "providerSubscriptionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialPaymentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialBillingOperation_seatChangeRequestId_key" ON "CommercialBillingOperation"("seatChangeRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialBillingOperation_idempotencyKey_key" ON "CommercialBillingOperation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CommercialBillingOperation_businessId_status_effectiveAt_idx" ON "CommercialBillingOperation"("businessId", "status", "effectiveAt");

-- CreateIndex
CREATE INDEX "CommercialBillingOperation_provider_providerSubscriptionId_idx" ON "CommercialBillingOperation"("provider", "providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialBillingOperation_id_businessId_key" ON "CommercialBillingOperation"("id", "businessId");

-- CreateIndex
CREATE INDEX "CommercialPaymentEvidence_operationId_status_idx" ON "CommercialPaymentEvidence"("operationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialPaymentEvidence_provider_paymentId_key" ON "CommercialPaymentEvidence"("provider", "paymentId");

-- AddForeignKey
ALTER TABLE "CommercialBillingOperation" ADD CONSTRAINT "CommercialBillingOperation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialBillingOperation" ADD CONSTRAINT "CommercialBillingOperation_subscriptionId_businessId_fkey" FOREIGN KEY ("subscriptionId", "businessId") REFERENCES "CommercialSubscription"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialBillingOperation" ADD CONSTRAINT "CommercialBillingOperation_seatChangeRequestId_fkey" FOREIGN KEY ("seatChangeRequestId") REFERENCES "SeatChangeRequest"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialPaymentEvidence" ADD CONSTRAINT "CommercialPaymentEvidence_operationId_businessId_fkey" FOREIGN KEY ("operationId", "businessId") REFERENCES "CommercialBillingOperation"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Operations are never public and can only represent sandbox intent.
ALTER TABLE "CommercialBillingOperation" ADD CONSTRAINT "CommercialBillingOperation_environment_check" CHECK (environment = 'SANDBOX'),
  ADD CONSTRAINT "CommercialBillingOperation_kind_check" CHECK (kind IN ('NEW_SUBSCRIPTION','CONTRACT_CHANGE')),
  ADD CONSTRAINT "CommercialBillingOperation_strategy_check" CHECK (strategy IN ('NEXT_RENEWAL','IMMEDIATE')),
  ADD CONSTRAINT "CommercialBillingOperation_status_check" CHECK (status IN ('PREPARED','SCHEDULED','EXECUTING','UNKNOWN','AWAITING_PAYMENT','PAID','APPLIED','REJECTED','CANCELLED')),
  ADD CONSTRAINT "CommercialBillingOperation_money_check" CHECK ("recurringAmountMinor" >= 0 AND "expectedPaymentMinor" >= 0 AND "taxAmountMinor" >= 0 AND "targetProfessionalTotal" > 0 AND "currencyCode" = 'CLP');
CREATE UNIQUE INDEX "CommercialBillingOperation_one_open_business" ON "CommercialBillingOperation"("businessId")
  WHERE status IN ('PREPARED','SCHEDULED','EXECUTING','UNKNOWN','AWAITING_PAYMENT','PAID');
ALTER TABLE "CommercialPaymentEvidence" ADD CONSTRAINT "CommercialPaymentEvidence_status_check" CHECK (status IN ('PENDING','CONFIRMED','REJECTED','REFUNDED','CHARGEBACK')),
  ADD CONSTRAINT "CommercialPaymentEvidence_amount_check" CHECK ("amountMinor" >= 0),
  ADD CONSTRAINT "CommercialPaymentEvidence_period_check" CHECK ("periodStart" < "periodEnd"),
  ADD CONSTRAINT "CommercialPaymentEvidence_origin_check" CHECK (origin IN ('SANDBOX_PROVIDER','CONTRACT_FIXTURE'));
ALTER TABLE "CommercialBillingOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialPaymentEvidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CommercialBillingOperation", "CommercialPaymentEvidence" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON TABLE "CommercialBillingOperation", "CommercialPaymentEvidence" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON TABLE "CommercialBillingOperation", "CommercialPaymentEvidence" FROM authenticated; END IF;
END $$;
