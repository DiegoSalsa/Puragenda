BEGIN;
-- CreateTable
CREATE TABLE "CommercialMigrationProposal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "previewHash" TEXT NOT NULL,
    "preview" JSONB NOT NULL,
    "targetPlanCode" TEXT NOT NULL,
    "professionalTotal" INTEGER NOT NULL,
    "provider" "CommercialBillingProvider" NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_APPROVAL',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialMigrationProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialWebsiteTransition" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "addonId" TEXT,
    "provider" TEXT,
    "externalSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "paidUntil" TIMESTAMP(3),
    "cancellationObservedAt" TIMESTAMP(3),
    "lastResourceAt" TIMESTAMP(3),
    "origin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialWebsiteTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialMigrationEvidence" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" "CommercialBillingProvider" NOT NULL,
    "eventId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "paymentId" TEXT,
    "amountMinor" INTEGER,
    "currencyCode" TEXT NOT NULL,
    "providerSubscriptionId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "resourceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialMigrationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialMigrationProposal_idempotencyKey_key" ON "CommercialMigrationProposal"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CommercialMigrationProposal_subscriptionId_businessId_idx" ON "CommercialMigrationProposal"("subscriptionId", "businessId");

-- CreateIndex
CREATE INDEX "CommercialMigrationProposal_businessId_status_effectiveAt_idx" ON "CommercialMigrationProposal"("businessId", "status", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialMigrationProposal_id_businessId_key" ON "CommercialMigrationProposal"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialWebsiteTransition_proposalId_key" ON "CommercialWebsiteTransition"("proposalId");

-- CreateIndex
CREATE INDEX "CommercialWebsiteTransition_businessId_status_idx" ON "CommercialWebsiteTransition"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialWebsiteTransition_proposalId_businessId_key" ON "CommercialWebsiteTransition"("proposalId", "businessId");

-- CreateIndex
CREATE INDEX "CommercialMigrationEvidence_proposalId_businessId_state_idx" ON "CommercialMigrationEvidence"("proposalId", "businessId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialMigrationEvidence_provider_eventId_key" ON "CommercialMigrationEvidence"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialMigrationEvidence_provider_paymentId_key" ON "CommercialMigrationEvidence"("provider", "paymentId");

-- AddForeignKey
ALTER TABLE "CommercialMigrationProposal" ADD CONSTRAINT "CommercialMigrationProposal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialMigrationProposal" ADD CONSTRAINT "CommercialMigrationProposal_subscriptionId_businessId_fkey" FOREIGN KEY ("subscriptionId", "businessId") REFERENCES "CommercialSubscription"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialWebsiteTransition" ADD CONSTRAINT "CommercialWebsiteTransition_proposalId_businessId_fkey" FOREIGN KEY ("proposalId", "businessId") REFERENCES "CommercialMigrationProposal"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialMigrationEvidence" ADD CONSTRAINT "CommercialMigrationEvidence_proposalId_businessId_fkey" FOREIGN KEY ("proposalId", "businessId") REFERENCES "CommercialMigrationProposal"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommercialMigrationProposal" ADD CONSTRAINT "CommercialMigrationProposal_status_check"
  CHECK (status IN ('AWAITING_APPROVAL','BLOCKED','PENDING_PROVIDER_CHANGE','PENDING_RECONCILIATION','SCHEDULED','APPLIED','UNKNOWN','INVALIDATED','CANCELLED')),
  ADD CONSTRAINT "CommercialMigrationProposal_target_check" CHECK ("targetPlanCode" IN ('PURAGENDA','PURAGENDA_PLUS') AND "professionalTotal">0),
  ADD CONSTRAINT "CommercialMigrationProposal_approval_check" CHECK (("approvedAt" IS NULL) = ("approvedById" IS NULL)
    AND (status NOT IN ('PENDING_PROVIDER_CHANGE','PENDING_RECONCILIATION','SCHEDULED','UNKNOWN','APPLIED') OR "approvedAt" IS NOT NULL)
    AND (status <> 'APPLIED' OR "appliedAt" IS NOT NULL));
CREATE UNIQUE INDEX "CommercialMigrationProposal_one_open_business" ON "CommercialMigrationProposal"("businessId")
  WHERE status IN ('PENDING_PROVIDER_CHANGE','PENDING_RECONCILIATION','SCHEDULED','UNKNOWN');
ALTER TABLE "CommercialWebsiteTransition" ADD CONSTRAINT "CommercialWebsiteTransition_status_check"
  CHECK (status IN ('REVIEW_REQUIRED','NOT_REQUIRED','PENDING_CANCELLATION','SCHEDULED','UNKNOWN','CANCELLED_VERIFIED','INCLUDED')),
  ADD CONSTRAINT "CommercialWebsiteTransition_evidence_check" CHECK (status NOT IN ('CANCELLED_VERIFIED','INCLUDED') OR ("cancellationObservedAt" IS NOT NULL AND origin IS NOT NULL AND origin IN ('CONTRACT_FIXTURE','SANDBOX_PROVIDER')));
ALTER TABLE "CommercialMigrationEvidence" ADD CONSTRAINT "CommercialMigrationEvidence_origin_check" CHECK (origin IN ('CONTRACT_FIXTURE','SANDBOX_PROVIDER')),
  ADD CONSTRAINT "CommercialMigrationEvidence_state_check" CHECK (state IN ('PENDING','CONFIRMED','REJECTED','REFUNDED','CHARGEBACK','CANCELLED','UNKNOWN')),
  ADD CONSTRAINT "CommercialMigrationEvidence_money_check" CHECK ("amountMinor">=0 AND "currencyCode"='CLP'),
  ADD CONSTRAINT "CommercialMigrationEvidence_period_check" CHECK ("periodStart" IS NULL OR "periodEnd" IS NULL OR "periodStart"<"periodEnd"),
  ADD CONSTRAINT "CommercialMigrationEvidence_confirmed_check" CHECK (state <> 'CONFIRMED' OR ("paymentId" IS NOT NULL AND "amountMinor" IS NOT NULL AND "periodStart" IS NOT NULL AND "periodEnd" IS NOT NULL));

CREATE FUNCTION commercial_migration_immutable_proposal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."businessId",NEW."subscriptionId",NEW."createdById",NEW."idempotencyKey",NEW."inputHash",NEW."sourceFingerprint",NEW."previewHash",NEW.preview,NEW."targetPlanCode",NEW."professionalTotal",NEW.provider,NEW."effectiveAt",NEW."expiresAt")
    IS DISTINCT FROM ROW(OLD."businessId",OLD."subscriptionId",OLD."createdById",OLD."idempotencyKey",OLD."inputHash",OLD."sourceFingerprint",OLD."previewHash",OLD.preview,OLD."targetPlanCode",OLD."professionalTotal",OLD.provider,OLD."effectiveAt",OLD."expiresAt")
    THEN RAISE EXCEPTION 'IMMUTABLE_COMMERCIAL_PROPOSAL'; END IF;
  IF OLD."approvedAt" IS NOT NULL AND ROW(NEW."approvedAt",NEW."approvedById") IS DISTINCT FROM ROW(OLD."approvedAt",OLD."approvedById")
    THEN RAISE EXCEPTION 'IMMUTABLE_COMMERCIAL_APPROVAL'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CommercialMigrationProposal_immutable" BEFORE UPDATE ON "CommercialMigrationProposal"
  FOR EACH ROW EXECUTE FUNCTION commercial_migration_immutable_proposal();
REVOKE ALL ON FUNCTION commercial_migration_immutable_proposal() FROM PUBLIC;

ALTER TABLE "CommercialMigrationProposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialWebsiteTransition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialMigrationEvidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM PUBLIC, anon, authenticated;
COMMIT;
