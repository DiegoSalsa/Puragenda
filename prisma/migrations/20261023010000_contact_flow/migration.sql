-- CreateTable
CREATE TABLE "CfPolicy" (
    "key" TEXT NOT NULL,
    "businessId" TEXT,
    "killed" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyLimit" INTEGER NOT NULL,
    "monthlyLimit" INTEGER NOT NULL,
    "contactDays" INTEGER NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfPolicy_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CfCampaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "locationId" TEXT,
    "staffId" TEXT,
    "recommendationId" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfVersion" (
    "timezone" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "recommendationVersion" INTEGER NOT NULL,
    "recommendationHash" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "rules" JSONB NOT NULL,
    "objective" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "purpose" TEXT NOT NULL DEFAULT 'COMMERCIAL',
    "template" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "servicePrice" DOUBLE PRECISION NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessSlug" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "cohortHash" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxContacts" INTEGER NOT NULL,
    "dailyLimit" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfAuthorization" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CfAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfConsent" (
    "acceptedText" TEXT NOT NULL,
    "evidenceSignature" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'COMMERCIAL',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "source" TEXT NOT NULL,
    "textVersion" TEXT NOT NULL,
    "evidenceRef" TEXT NOT NULL,
    "evidenceHash" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'GRANTED',
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfSuppression" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfEnrollment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "addressHash" TEXT NOT NULL,
    "consentId" TEXT,
    "eligible" BOOLEAN NOT NULL,
    "exclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'SIMULATED',
    "providerId" TEXT,
    "simulation" TEXT NOT NULL DEFAULT 'SUCCESS',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfOutbox" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "fence" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "firstAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "CfOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfAttempt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "fence" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfSimulatedReceipt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfSimulatedReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfProviderEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfQuotaBucket" (
    "key" TEXT NOT NULL,
    "businessId" TEXT,
    "kind" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "consumed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CfQuotaBucket_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CfQuotaReservation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "CfQuotaReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfQuotaAllocation" (
    "reservationId" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,

    CONSTRAINT "CfQuotaAllocation_pkey" PRIMARY KEY ("reservationId","bucketKey")
);

-- CreateTable
CREATE TABLE "CfToken" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "CfToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfAttribution" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfAudit" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "campaignId" TEXT,
    "actorId" TEXT,
    "event" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CfCampaign_businessId_scopeKey_status_createdAt_idx" ON "CfCampaign"("businessId", "scopeKey", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfCampaign_id_businessId_key" ON "CfCampaign"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfCampaign_businessId_scopeKey_recommendationId_key" ON "CfCampaign"("businessId", "scopeKey", "recommendationId");

-- CreateIndex
CREATE INDEX "CfVersion_businessId_expiresAt_idx" ON "CfVersion"("businessId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfVersion_id_businessId_key" ON "CfVersion"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfVersion_campaignId_version_key" ON "CfVersion"("campaignId", "version");

-- CreateIndex
CREATE INDEX "CfAuthorization_businessId_versionId_revokedAt_idx" ON "CfAuthorization"("businessId", "versionId", "revokedAt");

-- CreateIndex
CREATE INDEX "CfConsent_businessId_clientId_channel_purpose_state_idx" ON "CfConsent"("businessId", "clientId", "channel", "purpose", "state");

-- CreateIndex
CREATE UNIQUE INDEX "CfConsent_id_businessId_key" ON "CfConsent"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfConsent_businessId_evidenceRef_key" ON "CfConsent"("businessId", "evidenceRef");

-- CreateIndex
CREATE INDEX "CfSuppression_businessId_clientId_channel_purpose_idx" ON "CfSuppression"("businessId", "clientId", "channel", "purpose");

-- CreateIndex
CREATE INDEX "CfSuppression_businessId_addressHash_channel_purpose_idx" ON "CfSuppression"("businessId", "addressHash", "channel", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "CfSuppression_businessId_sourceRef_key" ON "CfSuppression"("businessId", "sourceRef");

-- CreateIndex
CREATE INDEX "CfEnrollment_businessId_clientId_createdAt_idx" ON "CfEnrollment"("businessId", "clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfEnrollment_id_businessId_key" ON "CfEnrollment"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfEnrollment_versionId_clientId_key" ON "CfEnrollment"("versionId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CfMessage_enrollmentId_key" ON "CfMessage"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CfMessage_idempotencyKey_key" ON "CfMessage"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CfMessage_providerId_key" ON "CfMessage"("providerId");

-- CreateIndex
CREATE INDEX "CfMessage_businessId_state_createdAt_idx" ON "CfMessage"("businessId", "state", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfMessage_enrollmentId_businessId_key" ON "CfMessage"("enrollmentId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfMessage_id_businessId_key" ON "CfMessage"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfOutbox_messageId_key" ON "CfOutbox"("messageId");

-- CreateIndex
CREATE INDEX "CfOutbox_state_nextAttemptAt_leaseUntil_idx" ON "CfOutbox"("state", "nextAttemptAt", "leaseUntil");

-- CreateIndex
CREATE INDEX "CfOutbox_businessId_state_idx" ON "CfOutbox"("businessId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "CfOutbox_messageId_businessId_key" ON "CfOutbox"("messageId", "businessId");

-- CreateIndex
CREATE INDEX "CfAttempt_businessId_createdAt_idx" ON "CfAttempt"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfAttempt_messageId_number_key" ON "CfAttempt"("messageId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CfSimulatedReceipt_messageId_key" ON "CfSimulatedReceipt"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "CfSimulatedReceipt_idempotencyKey_key" ON "CfSimulatedReceipt"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CfSimulatedReceipt_providerId_key" ON "CfSimulatedReceipt"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "CfSimulatedReceipt_messageId_businessId_key" ON "CfSimulatedReceipt"("messageId", "businessId");

-- CreateIndex
CREATE INDEX "CfProviderEvent_businessId_messageId_occurredAt_idx" ON "CfProviderEvent"("businessId", "messageId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfQuotaReservation_messageId_key" ON "CfQuotaReservation"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "CfQuotaReservation_messageId_businessId_key" ON "CfQuotaReservation"("messageId", "businessId");

-- CreateIndex
CREATE INDEX "CfToken_expiresAt_idx" ON "CfToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfToken_enrollmentId_kind_key" ON "CfToken"("enrollmentId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CfAttribution_enrollmentId_key" ON "CfAttribution"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CfAttribution_appointmentId_key" ON "CfAttribution"("appointmentId");

-- CreateIndex
CREATE INDEX "CfAttribution_businessId_createdAt_idx" ON "CfAttribution"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfAttribution_enrollmentId_businessId_key" ON "CfAttribution"("enrollmentId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfAttribution_appointmentId_businessId_key" ON "CfAttribution"("appointmentId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CfAudit_key_key" ON "CfAudit"("key");

-- CreateIndex
CREATE INDEX "CfAudit_businessId_createdAt_idx" ON "CfAudit"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessLocation_id_businessId_key" ON "BusinessLocation"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_id_businessId_key" ON "Service"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_id_businessId_key" ON "Appointment"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_id_businessId_key" ON "Client"("id", "businessId");

-- AddForeignKey
ALTER TABLE "CfPolicy" ADD CONSTRAINT "CfPolicy_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfCampaign" ADD CONSTRAINT "CfCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfCampaign" ADD CONSTRAINT "CfCampaign_locationId_businessId_fkey" FOREIGN KEY ("locationId", "businessId") REFERENCES "BusinessLocation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfCampaign" ADD CONSTRAINT "CfCampaign_recommendationId_businessId_scopeKey_fkey" FOREIGN KEY ("recommendationId", "businessId", "scopeKey") REFERENCES "PuriGrowthRecommendation"("id", "businessId", "scopeKey") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfVersion" ADD CONSTRAINT "CfVersion_campaignId_businessId_fkey" FOREIGN KEY ("campaignId", "businessId") REFERENCES "CfCampaign"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfVersion" ADD CONSTRAINT "CfVersion_serviceId_businessId_fkey" FOREIGN KEY ("serviceId", "businessId") REFERENCES "Service"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfAuthorization" ADD CONSTRAINT "CfAuthorization_versionId_businessId_fkey" FOREIGN KEY ("versionId", "businessId") REFERENCES "CfVersion"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfConsent" ADD CONSTRAINT "CfConsent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfConsent" ADD CONSTRAINT "CfConsent_clientId_businessId_fkey" FOREIGN KEY ("clientId", "businessId") REFERENCES "Client"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfSuppression" ADD CONSTRAINT "CfSuppression_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfSuppression" ADD CONSTRAINT "CfSuppression_clientId_businessId_fkey" FOREIGN KEY ("clientId", "businessId") REFERENCES "Client"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfEnrollment" ADD CONSTRAINT "CfEnrollment_versionId_businessId_fkey" FOREIGN KEY ("versionId", "businessId") REFERENCES "CfVersion"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfEnrollment" ADD CONSTRAINT "CfEnrollment_clientId_businessId_fkey" FOREIGN KEY ("clientId", "businessId") REFERENCES "Client"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfEnrollment" ADD CONSTRAINT "CfEnrollment_consentId_businessId_fkey" FOREIGN KEY ("consentId", "businessId") REFERENCES "CfConsent"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfMessage" ADD CONSTRAINT "CfMessage_enrollmentId_businessId_fkey" FOREIGN KEY ("enrollmentId", "businessId") REFERENCES "CfEnrollment"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfOutbox" ADD CONSTRAINT "CfOutbox_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "CfMessage"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfAttempt" ADD CONSTRAINT "CfAttempt_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "CfMessage"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfSimulatedReceipt" ADD CONSTRAINT "CfSimulatedReceipt_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "CfMessage"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfProviderEvent" ADD CONSTRAINT "CfProviderEvent_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "CfMessage"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfQuotaReservation" ADD CONSTRAINT "CfQuotaReservation_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "CfMessage"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfQuotaAllocation" ADD CONSTRAINT "CfQuotaAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "CfQuotaReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfQuotaAllocation" ADD CONSTRAINT "CfQuotaAllocation_bucketKey_fkey" FOREIGN KEY ("bucketKey") REFERENCES "CfQuotaBucket"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfToken" ADD CONSTRAINT "CfToken_enrollmentId_businessId_fkey" FOREIGN KEY ("enrollmentId", "businessId") REFERENCES "CfEnrollment"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfAttribution" ADD CONSTRAINT "CfAttribution_enrollmentId_businessId_fkey" FOREIGN KEY ("enrollmentId", "businessId") REFERENCES "CfEnrollment"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfAttribution" ADD CONSTRAINT "CfAttribution_appointmentId_businessId_fkey" FOREIGN KEY ("appointmentId", "businessId") REFERENCES "Appointment"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfAudit" ADD CONSTRAINT "CfAudit_campaignId_businessId_fkey" FOREIGN KEY ("campaignId", "businessId") REFERENCES "CfCampaign"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfAudit" ADD CONSTRAINT "CfAudit_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Private server-owned data: no browser/Data API grants and no public policies.
DO $$ DECLARE t text; r text; BEGIN
  FOREACH t IN ARRAY ARRAY['CfPolicy','CfCampaign','CfVersion','CfAuthorization','CfConsent','CfSuppression','CfEnrollment','CfMessage','CfOutbox','CfAttempt','CfSimulatedReceipt','CfProviderEvent','CfQuotaBucket','CfQuotaReservation','CfQuotaAllocation','CfToken','CfAttribution','CfAudit'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC',t);
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN EXECUTE format('REVOKE ALL ON TABLE %I FROM %I',t,r); END IF;
    END LOOP;
  END LOOP;
END $$;
ALTER TABLE "CfPolicy" ADD CONSTRAINT cf_policy_bounds CHECK ("dailyLimit">=0 AND "monthlyLimit">=0 AND "contactDays" BETWEEN 1 AND 365 AND ((key='GLOBAL' AND "businessId" IS NULL) OR (key<>'GLOBAL' AND "businessId" IS NOT NULL AND key="businessId")));
ALTER TABLE "CfCampaign" ADD CONSTRAINT cf_campaign_status CHECK(status IN ('DRAFT','READY','RUNNING','PAUSED','COMPLETED','CANCELLED') AND "currentVersion">0);
ALTER TABLE "CfVersion" ADD CONSTRAINT cf_version_contract CHECK (version BETWEEN 1 AND 20 AND "recommendationVersion">0 AND channel='EMAIL' AND purpose='COMMERCIAL' AND objective IN ('RECOVERY','FILL_AVAILABLE_TIME','REVIEW_DEMAND') AND template='cf-v1-'||objective AND "servicePrice">=0 AND "maxContacts" BETWEEN 1 AND 100 AND "dailyLimit" BETWEEN 1 AND 10 AND "dailyLimit"<="maxContacts" AND "expiresAt">"startsAt" AND length("contentHash")=64 AND length("cohortHash")=64);
ALTER TABLE "CfConsent" ADD CONSTRAINT cf_consent_contract CHECK (channel='EMAIL' AND purpose='COMMERCIAL' AND length("addressHash")=64 AND length("evidenceHash")=64 AND length("evidenceRef")>0 AND "textVersion"='cf-commercial-email-v1' AND length("acceptedText")>0 AND length("evidenceSignature")=43 AND source='SYNTHETIC_FORM' AND ((state='GRANTED' AND "revokedAt" IS NULL) OR (state='REVOKED' AND "revokedAt">="grantedAt")));
ALTER TABLE "CfSuppression" ADD CONSTRAINT cf_suppression_contract CHECK (channel IN ('EMAIL','ALL') AND purpose IN ('COMMERCIAL','ALL') AND reason IN ('WITHDRAWAL','UNSUBSCRIBE','INVALID_ADDRESS','HARD_BOUNCE','SPAM','ADMIN_BLOCK') AND length("addressHash")=64);
ALTER TABLE "CfEnrollment" ADD CONSTRAINT cf_enrollment_contract CHECK ((eligible AND exclusion IS NULL AND "consentId" IS NOT NULL) OR (NOT eligible AND exclusion IS NOT NULL));
ALTER TABLE "CfMessage" ADD CONSTRAINT cf_message_contract CHECK (provider='SIMULATED' AND state IN ('QUEUED','ACCEPTED','DELIVERED','BOUNCED','COMPLAINED','FAILED','EXCLUDED','UNKNOWN','EXPIRED') AND simulation IN ('SUCCESS','REJECT','BOUNCE','TIMEOUT_ACCEPTED','TIMEOUT_UNKNOWN','RATE_LIMIT','TEMPORARY','NO_IDEMPOTENCY_TIMEOUT'));
ALTER TABLE "CfOutbox" ADD CONSTRAINT cf_outbox_contract CHECK (state IN ('PENDING','LEASED','SENDING','DONE','UNKNOWN') AND fence>=0 AND attempts BETWEEN 0 AND 5 AND (state NOT IN ('LEASED','SENDING') OR ("leaseOwner" IS NOT NULL AND "leaseUntil" IS NOT NULL)));
ALTER TABLE "CfAttempt" ADD CONSTRAINT cf_attempt_contract CHECK (number BETWEEN 1 AND 5 AND fence>0 AND outcome IN ('STARTED','ACCEPTED','TEMPORARY','PERMANENT','UNKNOWN'));
ALTER TABLE "CfQuotaBucket" ADD CONSTRAINT cf_quota_bounds CHECK ("limit">=0 AND reserved>=0 AND consumed>=0 AND reserved+consumed<="limit");
ALTER TABLE "CfQuotaReservation" ADD CONSTRAINT cf_quota_state CHECK (state IN ('RESERVED','CONSUMED','RELEASED') AND ((state='RESERVED' AND "settledAt" IS NULL) OR (state<>'RESERVED' AND "settledAt" IS NOT NULL)));
ALTER TABLE "CfToken" ADD CONSTRAINT cf_token_kind CHECK(kind IN ('UNSUBSCRIBE','BOOKING') AND length(id)=43);
ALTER TABLE "CfProviderEvent" ADD CONSTRAINT cf_event_kind CHECK(provider IN ('SIMULATED','RESEND') AND kind IN ('ACCEPTED','DELIVERED','BOUNCED','COMPLAINED','FAILED') AND length("payloadHash")=64);

-- Guards live in a private schema, never exposed as privileged RPCs.
CREATE SCHEMA IF NOT EXISTS contact_flow_private;
CREATE UNIQUE INDEX "Staff_id_businessId_key" ON "Staff"("id","businessId");
ALTER TABLE "CfCampaign" ADD CONSTRAINT "CfCampaign_staffId_businessId_fkey" FOREIGN KEY ("staffId","businessId") REFERENCES "Staff"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
REVOKE ALL ON SCHEMA contact_flow_private FROM PUBLIC;
CREATE FUNCTION contact_flow_private.immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'CONTACT_FLOW_IMMUTABLE_RECORD'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER cf_version_immutable BEFORE UPDATE ON "CfVersion" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.immutable_record();
CREATE TRIGGER cf_suppression_immutable BEFORE UPDATE ON "CfSuppression" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.immutable_record();
CREATE TRIGGER cf_enrollment_immutable BEFORE UPDATE ON "CfEnrollment" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.immutable_record();
CREATE TRIGGER cf_provider_event_immutable BEFORE UPDATE ON "CfProviderEvent" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.immutable_record();
CREATE TRIGGER cf_attribution_immutable BEFORE UPDATE ON "CfAttribution" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.immutable_record();
CREATE TRIGGER cf_audit_immutable BEFORE UPDATE ON "CfAudit" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.immutable_record();
CREATE FUNCTION contact_flow_private.campaign_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF (NEW.id,NEW."businessId",NEW."scopeKey",NEW."recommendationId",NEW."locationId",NEW."staffId",NEW."createdById") IS DISTINCT FROM (OLD.id,OLD."businessId",OLD."scopeKey",OLD."recommendationId",OLD."locationId",OLD."staffId",OLD."createdById") THEN RAISE EXCEPTION 'CONTACT_FLOW_CAMPAIGN_IDENTITY_IMMUTABLE'; END IF;
  IF NEW."currentVersion"<>OLD."currentVersion" AND (OLD.status<>'DRAFT' OR NEW."currentVersion"<>OLD."currentVersion"+1) THEN RAISE EXCEPTION 'CONTACT_FLOW_VERSION_TRANSITION'; END IF;
  IF NEW.status<>OLD.status AND NOT ((OLD.status='DRAFT' AND NEW.status IN ('READY','CANCELLED')) OR (OLD.status='READY' AND NEW.status IN ('RUNNING','PAUSED','CANCELLED','COMPLETED')) OR (OLD.status='RUNNING' AND NEW.status IN ('PAUSED','CANCELLED','COMPLETED')) OR (OLD.status='PAUSED' AND NEW.status IN ('READY','CANCELLED'))) THEN RAISE EXCEPTION 'CONTACT_FLOW_STATE_TRANSITION'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cf_campaign_transition BEFORE UPDATE ON "CfCampaign" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.campaign_transition();
CREATE FUNCTION contact_flow_private.consent_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF (to_jsonb(NEW)-'state'-'revokedAt') IS DISTINCT FROM (to_jsonb(OLD)-'state'-'revokedAt') OR (OLD.state='REVOKED' AND NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'CONTACT_FLOW_CONSENT_IMMUTABLE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER cf_consent_transition BEFORE UPDATE ON "CfConsent" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.consent_transition();
CREATE FUNCTION contact_flow_private.authorization_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF TG_OP='UPDATE' THEN
    IF (to_jsonb(NEW)-'revokedAt') IS DISTINCT FROM (to_jsonb(OLD)-'revokedAt') OR (OLD."revokedAt" IS NOT NULL AND NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'CONTACT_FLOW_AUTHORIZATION_IMMUTABLE'; END IF;
  ELSE
    IF NOT EXISTS(SELECT 1 FROM "CfVersion" v JOIN "CfCampaign" c ON c.id=v."campaignId" AND c."businessId"=v."businessId" JOIN "Business" b ON b.id=c."businessId" JOIN "PuriGrowthRecommendation" r ON r.id=c."recommendationId" AND r."businessId"=c."businessId" AND r."scopeKey"=c."scopeKey" WHERE v.id=NEW."versionId" AND v."businessId"=NEW."businessId" AND v."contentHash"=NEW."contentHash" AND c."currentVersion"=v.version AND c.status='DRAFT' AND b."ownerId"=NEW."actorId" AND r.status='APPROVED' AND r.version=v."recommendationVersion" AND r."contentHash"=v."recommendationHash" AND NEW."expiresAt"<=v."expiresAt") THEN RAISE EXCEPTION 'CONTACT_FLOW_AUTHORIZATION_INVALID'; END IF;
  END IF; RETURN NEW;
END $$;
CREATE TRIGGER cf_authorization_guard BEFORE INSERT OR UPDATE ON "CfAuthorization" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.authorization_guard();
CREATE UNIQUE INDEX cf_one_active_authorization ON "CfAuthorization"("versionId") WHERE "revokedAt" IS NULL;
CREATE INDEX cf_pending_jobs ON "CfOutbox"("nextAttemptAt",id) WHERE state IN ('PENDING','LEASED','SENDING');
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA contact_flow_private FROM PUBLIC;

CREATE FUNCTION contact_flow_private.outbox_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF (NEW.id,NEW."businessId",NEW."messageId") IS DISTINCT FROM (OLD.id,OLD."businessId",OLD."messageId") OR NEW.fence<OLD.fence OR NEW.fence>OLD.fence+1 OR NEW.attempts<OLD.attempts OR NEW.attempts>OLD.attempts+1 THEN RAISE EXCEPTION 'CONTACT_FLOW_OUTBOX_FENCE'; END IF;
  IF NEW.fence>OLD.fence AND (NEW.state<>'LEASED' OR NEW."leaseOwner" IS NULL) THEN RAISE EXCEPTION 'CONTACT_FLOW_OUTBOX_FENCE'; END IF;
  IF NEW.state<>OLD.state AND NOT ((OLD.state='PENDING' AND NEW.state IN ('LEASED','DONE','UNKNOWN')) OR (OLD.state='LEASED' AND NEW.state IN ('SENDING','PENDING','DONE','UNKNOWN')) OR (OLD.state='SENDING' AND NEW.state IN ('LEASED','PENDING','DONE','UNKNOWN')) OR (OLD.state='UNKNOWN' AND NEW.state='DONE')) THEN RAISE EXCEPTION 'CONTACT_FLOW_OUTBOX_STATE'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cf_outbox_transition BEFORE UPDATE ON "CfOutbox" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.outbox_transition();
CREATE FUNCTION contact_flow_private.token_transition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF (to_jsonb(NEW)-'usedAt') IS DISTINCT FROM (to_jsonb(OLD)-'usedAt') OR (OLD."usedAt" IS NOT NULL AND NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'CONTACT_FLOW_TOKEN_IMMUTABLE'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER cf_token_transition BEFORE UPDATE ON "CfToken" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.token_transition();
CREATE FUNCTION contact_flow_private.allocation_tenant() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM "CfQuotaReservation" r JOIN "CfQuotaBucket" b ON b.key=NEW."bucketKey" WHERE r.id=NEW."reservationId" AND (b."businessId" IS NULL OR b."businessId"=r."businessId")) THEN RAISE EXCEPTION 'CONTACT_FLOW_QUOTA_TENANT'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER cf_allocation_tenant BEFORE INSERT OR UPDATE ON "CfQuotaAllocation" FOR EACH ROW EXECUTE FUNCTION contact_flow_private.allocation_tenant();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA contact_flow_private FROM PUBLIC;
