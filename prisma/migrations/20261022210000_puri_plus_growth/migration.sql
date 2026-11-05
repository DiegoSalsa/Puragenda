BEGIN;
-- AlterTable
ALTER TABLE "PuriRequest" ADD COLUMN     "capabilityTier" TEXT NOT NULL DEFAULT 'PURI_STANDARD';

-- CreateTable
CREATE TABLE "PuriGrowthPolicy" (
    "businessId" TEXT NOT NULL,
    "proactiveEnabled" BOOLEAN NOT NULL DEFAULT false,
    "everyHours" INTEGER NOT NULL DEFAULT 24,
    "rules" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuriGrowthPolicy_pkey" PRIMARY KEY ("businessId")
);

-- CreateTable
CREATE TABLE "PuriGrowthRun" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "locationId" TEXT,
    "staffId" TEXT,
    "analysisKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "leaseToken" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "evidence" JSONB,
    "evidenceHash" TEXT,
    "durationMs" INTEGER,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuriGrowthRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriGrowthSignal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "materialHash" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "confidence" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "suppressedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuriGrowthSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriGrowthRecommendation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "strategy" JSONB,
    "contentHash" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cachedTokens" INTEGER,
    "costMicros" INTEGER,
    "costKnown" BOOLEAN NOT NULL DEFAULT false,
    "generation" TEXT NOT NULL DEFAULT 'DETERMINISTIC',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedContentHash" TEXT,
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "executable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuriGrowthRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriBudgetBucket" (
    "key" TEXT NOT NULL,
    "businessId" TEXT,
    "category" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "limitMicros" INTEGER NOT NULL,
    "limitUnits" INTEGER NOT NULL,
    "reservedMicros" INTEGER NOT NULL DEFAULT 0,
    "spentMicros" INTEGER NOT NULL DEFAULT 0,
    "reservedUnits" INTEGER NOT NULL DEFAULT 0,
    "spentUnits" INTEGER NOT NULL DEFAULT 0,
    "unknownCost" BOOLEAN NOT NULL DEFAULT false,
    "alertLevel" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PuriBudgetBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PuriUsageReservation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "bucketKeys" TEXT[],
    "reservedMicros" INTEGER NOT NULL,
    "reservedUnits" INTEGER NOT NULL,
    "actualMicros" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cachedTokens" INTEGER,
    "model" TEXT,
    "state" TEXT NOT NULL DEFAULT 'RESERVED',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "PuriUsageReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuriGrowthAudit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "recommendationId" TEXT,
    "event" TEXT NOT NULL,
    "actorId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuriGrowthAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PuriGrowthRun_analysisKey_key" ON "PuriGrowthRun"("analysisKey");

-- CreateIndex
CREATE INDEX "PuriGrowthRun_businessId_scopeKey_status_periodEnd_idx" ON "PuriGrowthRun"("businessId", "scopeKey", "status", "periodEnd");

-- CreateIndex
CREATE INDEX "PuriGrowthRun_status_leaseUntil_idx" ON "PuriGrowthRun"("status", "leaseUntil");

-- CreateIndex
CREATE INDEX "PuriGrowthRun_expiresAt_idx" ON "PuriGrowthRun"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PuriGrowthRun_id_businessId_scopeKey_key" ON "PuriGrowthRun"("id", "businessId", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PuriGrowthSignal_dedupeKey_key" ON "PuriGrowthSignal"("dedupeKey");

-- CreateIndex
CREATE INDEX "PuriGrowthSignal_businessId_scopeKey_kind_materialHash_idx" ON "PuriGrowthSignal"("businessId", "scopeKey", "kind", "materialHash");

-- CreateIndex
CREATE INDEX "PuriGrowthSignal_businessId_scopeKey_status_expiresAt_idx" ON "PuriGrowthSignal"("businessId", "scopeKey", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "PuriGrowthSignal_runId_businessId_scopeKey_idx" ON "PuriGrowthSignal"("runId", "businessId", "scopeKey");

-- CreateIndex
CREATE INDEX "PuriGrowthSignal_expiresAt_idx" ON "PuriGrowthSignal"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PuriGrowthSignal_id_businessId_scopeKey_key" ON "PuriGrowthSignal"("id", "businessId", "scopeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PuriGrowthRecommendation_dedupeKey_key" ON "PuriGrowthRecommendation"("dedupeKey");

-- CreateIndex
CREATE INDEX "PuriGrowthRecommendation_businessId_scopeKey_status_created_idx" ON "PuriGrowthRecommendation"("businessId", "scopeKey", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PuriGrowthRecommendation_signalId_businessId_scopeKey_idx" ON "PuriGrowthRecommendation"("signalId", "businessId", "scopeKey");

-- CreateIndex
CREATE INDEX "PuriGrowthRecommendation_expiresAt_idx" ON "PuriGrowthRecommendation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PuriGrowthRecommendation_id_businessId_scopeKey_key" ON "PuriGrowthRecommendation"("id", "businessId", "scopeKey");

-- CreateIndex
CREATE INDEX "PuriBudgetBucket_businessId_category_periodStart_idx" ON "PuriBudgetBucket"("businessId", "category", "periodStart");

-- CreateIndex
CREATE INDEX "PuriBudgetBucket_periodStart_idx" ON "PuriBudgetBucket"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "PuriUsageReservation_idempotencyKey_key" ON "PuriUsageReservation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PuriUsageReservation_businessId_category_createdAt_idx" ON "PuriUsageReservation"("businessId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "PuriUsageReservation_state_createdAt_idx" ON "PuriUsageReservation"("state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PuriGrowthAudit_dedupeKey_key" ON "PuriGrowthAudit"("dedupeKey");

-- CreateIndex
CREATE INDEX "PuriGrowthAudit_businessId_event_createdAt_idx" ON "PuriGrowthAudit"("businessId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "PuriGrowthAudit_recommendationId_businessId_scopeKey_idx" ON "PuriGrowthAudit"("recommendationId", "businessId", "scopeKey");

-- CreateIndex
CREATE INDEX "PuriGrowthAudit_createdAt_idx" ON "PuriGrowthAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "PuriGrowthPolicy" ADD CONSTRAINT "PuriGrowthPolicy_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriGrowthRun" ADD CONSTRAINT "PuriGrowthRun_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriGrowthSignal" ADD CONSTRAINT "PuriGrowthSignal_runId_businessId_scopeKey_fkey" FOREIGN KEY ("runId", "businessId", "scopeKey") REFERENCES "PuriGrowthRun"("id", "businessId", "scopeKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriGrowthRecommendation" ADD CONSTRAINT "PuriGrowthRecommendation_signalId_businessId_scopeKey_fkey" FOREIGN KEY ("signalId", "businessId", "scopeKey") REFERENCES "PuriGrowthSignal"("id", "businessId", "scopeKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriBudgetBucket" ADD CONSTRAINT "PuriBudgetBucket_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriUsageReservation" ADD CONSTRAINT "PuriUsageReservation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriGrowthAudit" ADD CONSTRAINT "PuriGrowthAudit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PuriGrowthAudit" ADD CONSTRAINT "PuriGrowthAudit_recommendationId_businessId_scopeKey_fkey" FOREIGN KEY ("recommendationId", "businessId", "scopeKey") REFERENCES "PuriGrowthRecommendation"("id", "businessId", "scopeKey") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PuriRequest" ADD CONSTRAINT "PuriRequest_capabilityTier_check" CHECK ("capabilityTier" IN ('PURI_STANDARD','PURI_PLUS','PURI_PLUS_PREPARE'));
ALTER TABLE "PuriGrowthRun" ADD COLUMN "proactiveCheckedAt" TIMESTAMP(3);
CREATE INDEX "PuriGrowthRun_businessId_scopeKey_proactiveCheckedAt_idx" ON "PuriGrowthRun"("businessId","scopeKey","proactiveCheckedAt");
ALTER TABLE "PuriGrowthPolicy" ADD CONSTRAINT "PuriGrowthPolicy_frequency_check" CHECK ("everyHours" BETWEEN 1 AND 168);
ALTER TABLE "PuriGrowthRun" ADD CONSTRAINT "PuriGrowthRun_status_check" CHECK (status IN ('RUNNING','COMPLETE','FAILED')),
  ADD CONSTRAINT "PuriGrowthRun_kind_check" CHECK (kind IN ('INTERACTIVE','PROACTIVE')),
  ADD CONSTRAINT "PuriGrowthRun_period_check" CHECK ("periodStart"<"periodEnd" AND "expiresAt">"createdAt" AND attempts>0 AND "cacheHits">=0),
  ADD CONSTRAINT "PuriGrowthRun_complete_check" CHECK (status<>'COMPLETE' OR (evidence IS NOT NULL AND "evidenceHash" IS NOT NULL AND "completedAt" IS NOT NULL));
ALTER TABLE "PuriGrowthSignal" ADD CONSTRAINT "PuriGrowthSignal_status_check" CHECK (status IN ('DETECTED','SUPPRESSED','EXPIRED')),
  ADD CONSTRAINT "PuriGrowthSignal_kind_check" CHECK (kind IN ('INACTIVE_CLIENTS','LOW_OCCUPANCY','DEMAND_DECLINE','SERVICE_TREND')),
  ADD CONSTRAINT "PuriGrowthSignal_confidence_check" CHECK (confidence IN ('LOW','MEDIUM','HIGH') AND priority BETWEEN 0 AND 100);
ALTER TABLE "PuriGrowthRecommendation" ADD CONSTRAINT "PuriGrowthRecommendation_status_check" CHECK (status IN ('DRAFT','PROPOSED','REVIEWED','APPROVED','REJECTED','EXPIRED','STALE')),
  ADD CONSTRAINT "PuriGrowthRecommendation_no_execution" CHECK (executable=false),
  ADD CONSTRAINT "PuriGrowthRecommendation_approval_check" CHECK (status<>'APPROVED' OR ("approvedAt" IS NOT NULL AND "approvedById" IS NOT NULL AND "approvedContentHash"="contentHash" AND strategy IS NOT NULL)),
  ADD CONSTRAINT "PuriGrowthRecommendation_strategy_check" CHECK (status NOT IN ('PROPOSED','REVIEWED','APPROVED') OR (strategy IS NOT NULL AND coalesce(strategy->>'executable','')='false' AND coalesce(strategy->>'engine','')='CONTACT_FLOW_NOT_IMPLEMENTED')),
  ADD CONSTRAINT "PuriGrowthRecommendation_cost_check" CHECK (version>0 AND (NOT "costKnown" OR "costMicros" IS NOT NULL) AND ("costMicros" IS NULL OR "costMicros">=0));
ALTER TABLE "PuriBudgetBucket" ADD CONSTRAINT "PuriBudgetBucket_nonnegative" CHECK ("limitMicros">=0 AND "limitUnits">=0 AND "spentMicros">=0 AND "reservedMicros">=0 AND "spentUnits">=0 AND "reservedUnits">=0 AND "alertLevel" IN (0,50,80,100)),
  ADD CONSTRAINT "PuriBudgetBucket_category" CHECK (category IN ('ALL','STANDARD_INTERACTIVE','PLUS_INTERACTIVE','RECOMMENDATION','ANALYSIS_SQL','PROACTIVE_SQL'));
ALTER TABLE "PuriUsageReservation" ADD CONSTRAINT "PuriUsageReservation_amounts" CHECK ("reservedMicros">=0 AND "reservedUnits">0 AND ("actualMicros" IS NULL OR "actualMicros">=0) AND cardinality("bucketKeys")=3),
  ADD CONSTRAINT "PuriUsageReservation_state" CHECK (state IN ('RESERVED','SETTLED','UNKNOWN') AND (state<>'SETTLED' OR "actualMicros" IS NOT NULL)),
  ADD CONSTRAINT "PuriUsageReservation_category" CHECK (category IN ('STANDARD_INTERACTIVE','PLUS_INTERACTIVE','RECOMMENDATION','ANALYSIS_SQL','PROACTIVE_SQL'));

CREATE FUNCTION puri_growth_immutable_proposal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status<>OLD.status AND NOT (
    (OLD.status='DRAFT' AND NEW.status IN ('PROPOSED','REJECTED','EXPIRED','STALE')) OR
    (OLD.status='PROPOSED' AND NEW.status IN ('REVIEWED','REJECTED','EXPIRED','STALE')) OR
    (OLD.status='REVIEWED' AND NEW.status IN ('APPROVED','REJECTED','EXPIRED','STALE')) OR
    (OLD.status='APPROVED' AND NEW.status IN ('EXPIRED','STALE'))
  ) THEN RAISE EXCEPTION 'INVALID_GROWTH_STATE_TRANSITION'; END IF;
  IF ROW(NEW."businessId",NEW."scopeKey",NEW."signalId",NEW."evidenceHash",NEW.evidence,NEW."ruleVersion",NEW."expiresAt") IS DISTINCT FROM
     ROW(OLD."businessId",OLD."scopeKey",OLD."signalId",OLD."evidenceHash",OLD.evidence,OLD."ruleVersion",OLD."expiresAt")
    THEN RAISE EXCEPTION 'IMMUTABLE_GROWTH_EVIDENCE'; END IF;
  IF OLD.status<>'DRAFT' AND ROW(NEW.title,NEW.explanation,NEW.strategy,NEW.version,NEW."contentHash") IS DISTINCT FROM ROW(OLD.title,OLD.explanation,OLD.strategy,OLD.version,OLD."contentHash")
    THEN RAISE EXCEPTION 'IMMUTABLE_GROWTH_PROPOSAL'; END IF;
  IF OLD."approvedAt" IS NOT NULL AND ROW(NEW."approvedAt",NEW."approvedById",NEW."approvedContentHash") IS DISTINCT FROM ROW(OLD."approvedAt",OLD."approvedById",OLD."approvedContentHash")
    THEN RAISE EXCEPTION 'IMMUTABLE_GROWTH_APPROVAL'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PuriGrowthRecommendation_immutable" BEFORE UPDATE ON "PuriGrowthRecommendation" FOR EACH ROW EXECUTE FUNCTION puri_growth_immutable_proposal();
REVOKE ALL ON FUNCTION puri_growth_immutable_proposal() FROM PUBLIC;

ALTER TABLE "PuriGrowthPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriGrowthRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriGrowthSignal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriGrowthRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriBudgetBucket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriUsageReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriGrowthAudit" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM PUBLIC, anon, authenticated;
COMMIT;
