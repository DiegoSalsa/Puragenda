BEGIN;
ALTER TABLE "ClientPortalToken" ADD COLUMN "authenticationIntent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClientPortalSession" ADD COLUMN "email" TEXT;
CREATE INDEX "ClientPortalSession_email_idx" ON "ClientPortalSession"("email");
CREATE TABLE "ClientPortalIdentity" ("email" TEXT PRIMARY KEY, "legacyInvalidBefore" TIMESTAMP(3));
CREATE TABLE "ClientPortalRevocation" ("tokenHash" TEXT PRIMARY KEY, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "ClientPortalRevocation_expiresAt_idx" ON "ClientPortalRevocation"("expiresAt");
ALTER TABLE "Appointment" ADD COLUMN "portalOwnerEmail" TEXT;
ALTER TABLE "Client" ADD COLUMN "portalOwnerEmail" TEXT;
ALTER TABLE "RecurringBooking" ADD COLUMN "portalOwnerEmail" TEXT,
 ADD COLUMN "healthAcceptedAt" TIMESTAMP(3), ADD COLUMN "healthConsentVersion" TEXT,
 ADD COLUMN "healthConsentSnapshot" JSONB, ADD COLUMN "managementTokenHash" TEXT,
 ADD COLUMN "managementTokenExpiresAt" TIMESTAMP(3), ADD COLUMN "managementTokenRevokedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "RecurringBooking_managementTokenHash_key" ON "RecurringBooking"("managementTokenHash");
CREATE INDEX "RecurringBooking_portalOwnerEmail_idx" ON "RecurringBooking"("portalOwnerEmail");
CREATE INDEX "Appointment_portalOwnerEmail_idx" ON "Appointment"("portalOwnerEmail");
CREATE INDEX "Client_portalOwnerEmail_idx" ON "Client"("portalOwnerEmail");
-- Reservation snapshots are the legacy evidence; mutable CRM contact fields are not.
UPDATE "Appointment" SET "portalOwnerEmail" = lower(trim("customerEmail"));
UPDATE "RecurringBooking" SET "portalOwnerEmail" = lower(trim("customerEmail"));
UPDATE "Client" c SET "portalOwnerEmail" = evidence.email FROM (
 SELECT "clientId", min(email) email FROM (
  SELECT "clientId", "portalOwnerEmail" email FROM "Appointment" WHERE "clientId" IS NOT NULL
  UNION ALL SELECT "clientId", "portalOwnerEmail" FROM "RecurringBooking" WHERE "clientId" IS NOT NULL
 ) e GROUP BY "clientId" HAVING count(DISTINCT email) = 1
) evidence WHERE c.id = evidence."clientId";
-- No retrospective health acceptance timestamps or fabricated consent versions.
-- Trigger also covers older application writers during a coordinated rollout.
CREATE FUNCTION "portal_reservation_owner"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."clientId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Client" WHERE id=NEW."clientId" AND "businessId"=NEW."businessId") THEN
  RAISE EXCEPTION 'CLIENT_BUSINESS_MISMATCH';
 END IF;
 IF TG_OP = 'INSERT' THEN
  NEW."portalOwnerEmail" := lower(trim(NEW."customerEmail"));
 ELSE
  NEW."portalOwnerEmail" := OLD."portalOwnerEmail";
 END IF;
 IF TG_TABLE_NAME = 'Appointment' THEN
  IF NEW."recurringBookingId" IS NOT NULL THEN
   IF NOT EXISTS (SELECT 1 FROM "RecurringBooking" WHERE id=NEW."recurringBookingId" AND "businessId"=NEW."businessId") THEN RAISE EXCEPTION 'RECURRING_BUSINESS_MISMATCH'; END IF;
   IF TG_OP='INSERT' THEN SELECT "portalOwnerEmail" INTO NEW."portalOwnerEmail" FROM "RecurringBooking" WHERE id=NEW."recurringBookingId"; END IF;
  END IF;
 ELSIF TG_OP='INSERT' THEN
  IF (SELECT "requiresHealthForm" FROM "RecurringPlan" WHERE id=NEW."recurringPlanId") AND
   (NOT NEW."healthAccepted" OR NEW."healthAcceptedAt" IS NULL OR NEW."healthConsentVersion" IS NULL OR NEW."healthConsentSnapshot" IS NULL) THEN
   RAISE EXCEPTION 'HEALTH_CONSENT_REQUIRED';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Appointment_portal_owner" BEFORE INSERT OR UPDATE ON "Appointment" FOR EACH ROW EXECUTE FUNCTION "portal_reservation_owner"();
CREATE TRIGGER "RecurringBooking_portal_owner" BEFORE INSERT OR UPDATE ON "RecurringBooking" FOR EACH ROW EXECUTE FUNCTION "portal_reservation_owner"();
CREATE FUNCTION "portal_crm_owner"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN NEW."portalOwnerEmail" := lower(trim(NEW.email));
 ELSE NEW."portalOwnerEmail" := OLD."portalOwnerEmail"; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "Client_portal_owner" BEFORE INSERT OR UPDATE ON "Client" FOR EACH ROW EXECUTE FUNCTION "portal_crm_owner"();
ALTER TABLE "ClientPortalIdentity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientPortalRevocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ClientPortalIdentity", "ClientPortalRevocation" FROM PUBLIC, anon, authenticated;
-- The public widget reads availability through the server, never customer rows.
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringBooking" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Client", "Appointment", "RecurringBooking" FROM PUBLIC, anon, authenticated;
COMMIT;
