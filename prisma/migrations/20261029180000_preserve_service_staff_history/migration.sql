BEGIN;
-- Additive, all existing catalog entries stay active. No historical row is rewritten.
ALTER TABLE "Service" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "catalogVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceOptionCategory" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ServiceOptionAlternative" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Service_businessId_isActive_idx" ON "Service"("businessId", "isActive");

-- Protect every dependency (including array/JSON consumers) before any cascade runs.
-- Whole-tenant deletion still follows its existing policy: its Business is already gone.
CREATE FUNCTION prevent_catalog_history_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Business" WHERE "id" = OLD."businessId") THEN
    RAISE EXCEPTION 'CATALOG_HISTORY_REQUIRES_ARCHIVAL' USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER "Service_preserve_history" BEFORE DELETE ON "Service"
FOR EACH ROW EXECUTE FUNCTION prevent_catalog_history_delete();
CREATE TRIGGER "Staff_preserve_history" BEFORE DELETE ON "Staff"
FOR EACH ROW EXECUTE FUNCTION prevent_catalog_history_delete();

-- FOR SHARE conflicts with state changes. An insert either commits first (and is
-- seen by deactivation) or sees the new inactive state. There is no check/write gap.
CREATE FUNCTION check_booking_catalog_state() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE service_active boolean; staff_active boolean; sid text; must_check boolean;
BEGIN
  must_check := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN must_check := NEW."serviceId" IS DISTINCT FROM OLD."serviceId" OR NEW."businessId" IS DISTINCT FROM OLD."businessId"; END IF;
  IF must_check THEN
    SELECT "isActive" INTO service_active FROM "Service"
      WHERE "id" = NEW."serviceId" AND "businessId" = NEW."businessId" FOR SHARE;
    -- Already contracted recurring sessions continue, including after archival.
    IF TG_TABLE_NAME = 'Appointment' AND NOT COALESCE(service_active, false) THEN
      IF EXISTS (SELECT 1 FROM "RecurringBooking" WHERE "id" = NEW."recurringBookingId"
        AND "serviceId" = NEW."serviceId" AND "businessId" = NEW."businessId") THEN service_active := true; END IF;
    END IF;
    IF NOT COALESCE(service_active, false) THEN RAISE EXCEPTION 'SERVICE_NOT_BOOKABLE' USING ERRCODE = '23514'; END IF;
  END IF;
  IF TG_TABLE_NAME = 'Appointment' THEN
    IF TG_OP = 'INSERT' OR NEW."additionalServiceIds" IS DISTINCT FROM OLD."additionalServiceIds" THEN
      FOR sid IN SELECT unnest(NEW."additionalServiceIds") ORDER BY 1 LOOP
        SELECT "isActive" INTO service_active FROM "Service" WHERE "id" = sid AND "businessId" = NEW."businessId" FOR SHARE;
        IF NOT COALESCE(service_active, false) THEN RAISE EXCEPTION 'SERVICE_NOT_BOOKABLE' USING ERRCODE = '23514'; END IF;
      END LOOP;
    END IF;
  END IF;
  IF TG_TABLE_NAME IN ('Appointment', 'RecurringBooking') THEN
    must_check := TG_OP = 'INSERT';
    IF TG_OP = 'UPDATE' THEN
      must_check := NEW."staffId" IS DISTINCT FROM OLD."staffId" OR NEW."businessId" IS DISTINCT FROM OLD."businessId";
      IF TG_TABLE_NAME = 'Appointment' THEN must_check := must_check OR NEW."startTime" IS DISTINCT FROM OLD."startTime"; END IF;
    END IF;
    IF must_check AND NEW."staffId" IS NOT NULL THEN
      SELECT "isActive" INTO staff_active FROM "Staff" WHERE "id" = NEW."staffId" AND "businessId" = NEW."businessId" FOR SHARE;
      IF NOT COALESCE(staff_active, false) THEN RAISE EXCEPTION 'STAFF_NOT_BOOKABLE' USING ERRCODE = '23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Appointment_catalog_guard" BEFORE INSERT OR UPDATE ON "Appointment"
FOR EACH ROW EXECUTE FUNCTION check_booking_catalog_state();
CREATE TRIGGER "RecurringBooking_catalog_guard" BEFORE INSERT OR UPDATE ON "RecurringBooking"
FOR EACH ROW EXECUTE FUNCTION check_booking_catalog_state();
CREATE TRIGGER "ProductionOrder_catalog_guard" BEFORE INSERT OR UPDATE ON "ProductionOrder"
FOR EACH ROW EXECUTE FUNCTION check_booking_catalog_state();

COMMIT;
