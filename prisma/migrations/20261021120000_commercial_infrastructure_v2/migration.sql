-- Puragenda Next Iteración 3: additive commercial snapshots, entitlements,
-- idempotent event ledger and capacity change requests.
-- No legacy Subscription rows or provider records are modified here.

CREATE TYPE "CommercialSubscriptionStatus" AS ENUM (
  'DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'TRIALING',
  'PAST_DUE_GRACE', 'PAST_DUE_BLOCKED', 'SCHEDULED_CHANGE',
  'INACTIVE', 'CANCELLED', 'UNKNOWN'
);
CREATE TYPE "CommercialBillingProvider" AS ENUM (
  'NONE', 'MERCADO_PAGO', 'PADDLE', 'BANK_TRANSFER', 'MANUAL'
);
CREATE TYPE "CommercialSubscriptionItemKind" AS ENUM (
  'BASE_PLAN', 'PROFESSIONAL_SEATS', 'LEGACY_ADDON', 'BENEFIT'
);
CREATE TYPE "CommercialEntitlementStatus" AS ENUM (
  'ACTIVE', 'SCHEDULED', 'EXPIRED', 'REVOKED', 'UNKNOWN'
);
CREATE TYPE "CommercialEventOutcome" AS ENUM (
  'RECEIVED', 'APPLIED', 'IGNORED', 'REJECTED', 'UNKNOWN'
);
CREATE TYPE "SeatChangeRequestStatus" AS ENUM (
  'DRAFT', 'PENDING_PAYMENT', 'SCHEDULED', 'APPLIED', 'CANCELLED', 'REJECTED', 'UNKNOWN'
);
CREATE TYPE "SeatChangeKind" AS ENUM ('INCREASE', 'DECREASE');

CREATE TABLE "CommercialSubscription" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "legacySubscriptionId" TEXT,
  "catalogVersion" TEXT NOT NULL,
  "planCode" TEXT NOT NULL,
  "legacyPlanCode" TEXT,
  "currencyCode" TEXT NOT NULL DEFAULT 'CLP',
  "billingCycle" "BillingCycle" NOT NULL,
  "status" "CommercialSubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
  "provider" "CommercialBillingProvider" NOT NULL DEFAULT 'NONE',
  "externalCustomerId" TEXT,
  "externalSubscriptionId" TEXT,
  "externalReference" TEXT,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "renewalAt" TIMESTAMP(3),
  "trialStart" TIMESTAMP(3),
  "trialEnd" TIMESTAMP(3),
  "gracePeriodEndsAt" TIMESTAMP(3),
  "basePriceClp" INTEGER,
  "professionalTotal" INTEGER NOT NULL,
  "totalPriceClp" INTEGER,
  "termsSnapshot" JSONB,
  "snapshotHash" TEXT NOT NULL,
  "lastReconciledAt" TIMESTAMP(3),
  "lastReconciledEventId" TEXT,
  "lastPaymentAt" TIMESTAMP(3),
  "lastPaymentEventId" TEXT,
  "lastPaymentStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommercialSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialSubscription_planCode_check" CHECK ("planCode" IN ('PURAGENDA', 'PURAGENDA_PLUS', 'INDIVIDUAL', 'EQUIPO', 'TEST')),
  CONSTRAINT "CommercialSubscription_catalogVersion_check" CHECK (length(trim("catalogVersion")) > 0),
  CONSTRAINT "CommercialSubscription_currencyCode_check" CHECK (length("currencyCode") BETWEEN 3 AND 10),
  CONSTRAINT "CommercialSubscription_amounts_check" CHECK ("basePriceClp" >= 0 AND "professionalTotal" > 0 AND "totalPriceClp" >= 0),
  CONSTRAINT "CommercialSubscription_v2_monthly_check" CHECK ("planCode" IN ('INDIVIDUAL', 'EQUIPO', 'TEST') OR "billingCycle" = 'MONTHLY'),
  CONSTRAINT "CommercialSubscription_period_check" CHECK ("periodStart" IS NULL OR "periodEnd" IS NULL OR "periodStart" < "periodEnd"),
  CONSTRAINT "CommercialSubscription_trial_check" CHECK ("trialStart" IS NULL OR "trialEnd" IS NULL OR "trialStart" < "trialEnd")
);

CREATE UNIQUE INDEX "CommercialSubscription_businessId_key" ON "CommercialSubscription"("businessId");
CREATE UNIQUE INDEX "CommercialSubscription_legacySubscriptionId_key" ON "CommercialSubscription"("legacySubscriptionId");
CREATE INDEX "CommercialSubscription_status_renewalAt_idx" ON "CommercialSubscription"("status", "renewalAt");
CREATE INDEX "CommercialSubscription_planCode_status_idx" ON "CommercialSubscription"("planCode", "status");
CREATE INDEX "CommercialSubscription_externalSubscriptionId_idx" ON "CommercialSubscription"("externalSubscriptionId");

CREATE TABLE "CommercialSubscriptionItem" (
  "id" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "kind" "CommercialSubscriptionItemKind" NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "quantity" INTEGER NOT NULL,
  "unitAmountClp" INTEGER,
  "amountClp" INTEGER,
  "currencyCode" TEXT NOT NULL DEFAULT 'CLP',
  "catalogVersion" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "pricingSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommercialSubscriptionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialSubscriptionItem_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "CommercialSubscriptionItem_amounts_check" CHECK ("amountClp" >= 0 AND ("unitAmountClp" IS NULL OR "unitAmountClp" >= 0)),
  CONSTRAINT "CommercialSubscriptionItem_period_check" CHECK ("effectiveTo" IS NULL OR "effectiveFrom" < "effectiveTo")
);
CREATE INDEX "CommercialSubscriptionItem_subscriptionId_kind_effectiveFro_idx" ON "CommercialSubscriptionItem"("subscriptionId", "kind", "effectiveFrom");
CREATE INDEX "CommercialSubscriptionItem_subscriptionId_effectiveTo_idx" ON "CommercialSubscriptionItem"("subscriptionId", "effectiveTo");
CREATE UNIQUE INDEX "CommercialSubscriptionItem_subscriptionId_code_effectiveFro_key" ON "CommercialSubscriptionItem"("subscriptionId", "code", "effectiveFrom");

CREATE TABLE "CommercialEntitlement" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "status" "CommercialEntitlementStatus" NOT NULL DEFAULT 'UNKNOWN',
  "quantity" INTEGER,
  "source" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "reason" TEXT,
  "metadata" JSONB,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommercialEntitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialEntitlement_capability_check" CHECK (length(trim("capability")) > 0),
  CONSTRAINT "CommercialEntitlement_quantity_check" CHECK ("quantity" IS NULL OR "quantity" > 0),
  CONSTRAINT "CommercialEntitlement_period_check" CHECK ("validTo" IS NULL OR "validFrom" < "validTo")
);
CREATE UNIQUE INDEX "CommercialEntitlement_dedupeKey_key" ON "CommercialEntitlement"("dedupeKey");
CREATE INDEX "CommercialEntitlement_businessId_capability_status_idx" ON "CommercialEntitlement"("businessId", "capability", "status");
CREATE INDEX "CommercialEntitlement_subscriptionId_validFrom_validTo_idx" ON "CommercialEntitlement"("subscriptionId", "validFrom", "validTo");

CREATE TABLE "CommercialEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "source" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "outcome" "CommercialEventOutcome" NOT NULL DEFAULT 'RECEIVED',
  "providerReference" TEXT,
  "correlationId" TEXT,
  "payloadHash" TEXT,
  "details" JSONB,

  CONSTRAINT "CommercialEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialEvent_source_check" CHECK (length(trim("source")) > 0),
  CONSTRAINT "CommercialEvent_eventId_check" CHECK (length(trim("eventId")) > 0),
  CONSTRAINT "CommercialEvent_operation_check" CHECK (length(trim("operation")) > 0)
);
CREATE UNIQUE INDEX "CommercialEvent_source_eventId_key" ON "CommercialEvent"("source", "eventId");
CREATE INDEX "CommercialEvent_businessId_occurredAt_idx" ON "CommercialEvent"("businessId", "occurredAt");
CREATE INDEX "CommercialEvent_subscriptionId_outcome_idx" ON "CommercialEvent"("subscriptionId", "outcome");

CREATE TABLE "SeatChangeRequest" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "kind" "SeatChangeKind" NOT NULL,
  "status" "SeatChangeRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "previousProfessionalTotal" INTEGER NOT NULL,
  "requestedProfessionalTotal" INTEGER NOT NULL,
  "activeProfessionalsAtRequest" INTEGER NOT NULL,
  "quotedAmountClp" INTEGER NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'CLP',
  "catalogVersion" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "providerReference" TEXT,
  "paymentEvidence" JSONB,
  "quoteSnapshot" JSONB NOT NULL,
  "paymentEventId" TEXT,
  "conflictReason" TEXT,
  "appliedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SeatChangeRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeatChangeRequest_totals_check" CHECK ("previousProfessionalTotal" > 0 AND "requestedProfessionalTotal" > 0 AND "activeProfessionalsAtRequest" >= 0 AND "quotedAmountClp" >= 0),
  CONSTRAINT "SeatChangeRequest_kind_check" CHECK (("kind" = 'INCREASE' AND "requestedProfessionalTotal" > "previousProfessionalTotal") OR ("kind" = 'DECREASE' AND "requestedProfessionalTotal" < "previousProfessionalTotal"))
);
CREATE UNIQUE INDEX "SeatChangeRequest_idempotencyKey_key" ON "SeatChangeRequest"("idempotencyKey");
CREATE INDEX "SeatChangeRequest_businessId_status_effectiveAt_idx" ON "SeatChangeRequest"("businessId", "status", "effectiveAt");
CREATE INDEX "SeatChangeRequest_subscriptionId_status_idx" ON "SeatChangeRequest"("subscriptionId", "status");

ALTER TABLE "CommercialSubscription"
  ADD CONSTRAINT "CommercialSubscription_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialSubscription_legacySubscriptionId_fkey"
  FOREIGN KEY ("legacySubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscriptionItem"
  ADD CONSTRAINT "CommercialSubscriptionItem_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "CommercialSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialEntitlement"
  ADD CONSTRAINT "CommercialEntitlement_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialEvent"
  ADD CONSTRAINT "CommercialEvent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeatChangeRequest"
  ADD CONSTRAINT "SeatChangeRequest_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- These are server-only tables. RLS is defense in depth and the Data API is
-- explicitly closed until a reviewed server-side policy exists.
ALTER TABLE "CommercialSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialSubscriptionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialEntitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommercialEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SeatChangeRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE
  "CommercialSubscription",
  "CommercialSubscriptionItem",
  "CommercialEntitlement",
  "CommercialEvent",
  "SeatChangeRequest"
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      "CommercialSubscription",
      "CommercialSubscriptionItem",
      "CommercialEntitlement",
      "CommercialEvent",
      "SeatChangeRequest"
    FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      "CommercialSubscription",
      "CommercialSubscriptionItem",
      "CommercialEntitlement",
      "CommercialEvent",
      "SeatChangeRequest"
    FROM authenticated;
  END IF;
END
$$;
-- Tenant integrity also holds when a privileged writer supplies a forged ID.
CREATE UNIQUE INDEX "CommercialSubscription_id_businessId_key" ON "CommercialSubscription"("id", "businessId");
ALTER TABLE "CommercialEntitlement" ADD CONSTRAINT "CommercialEntitlement_subscriptionId_businessId_fkey"
  FOREIGN KEY ("subscriptionId", "businessId") REFERENCES "CommercialSubscription"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialEvent" ADD CONSTRAINT "CommercialEvent_tenant_fkey"
  FOREIGN KEY ("subscriptionId", "businessId") REFERENCES "CommercialSubscription"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SeatChangeRequest" ADD CONSTRAINT "SeatChangeRequest_subscriptionId_businessId_fkey"
  FOREIGN KEY ("subscriptionId", "businessId") REFERENCES "CommercialSubscription"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "SeatChangeRequest_paymentEventId_key" ON "SeatChangeRequest"("paymentEventId");
ALTER TABLE "SeatChangeRequest" ADD CONSTRAINT "SeatChangeRequest_paymentEventId_fkey"
  FOREIGN KEY ("paymentEventId") REFERENCES "CommercialEvent"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
CREATE UNIQUE INDEX "SeatChangeRequest_one_open_per_business" ON "SeatChangeRequest"("businessId")
  WHERE "status" IN ('DRAFT', 'PENDING_PAYMENT', 'SCHEDULED', 'UNKNOWN');
CREATE UNIQUE INDEX "CommercialSubscriptionItem_one_current_code" ON "CommercialSubscriptionItem"("subscriptionId", "code") WHERE "effectiveTo" IS NULL;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_v2_currency_check"
  CHECK ("legacySubscriptionId" IS NOT NULL OR "currencyCode" = 'CLP');

ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_v2_amounts_required"
  CHECK ("legacySubscriptionId" IS NOT NULL OR ("basePriceClp" IS NOT NULL AND "totalPriceClp" IS NOT NULL));
ALTER TABLE "SeatChangeRequest" ADD CONSTRAINT "SeatChangeRequest_idempotency_nonempty"
  CHECK (length(trim("idempotencyKey")) BETWEEN 8 AND 200);
