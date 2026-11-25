-- Dashboard operators can explicitly confirm an overlap after seeing the
-- conflicting appointment. Public booking keeps the capacity guard.
CREATE OR REPLACE FUNCTION puragenda_guard_appointment_capacity() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE business_only boolean;
BEGIN
  IF NEW."status" = 'CANCELLED' THEN RETURN NEW; END IF;
  IF current_setting('puragenda.allow_manual_overlap', true) = 'on' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('booking-capacity:' || NEW."businessId", 0));
  SELECT COALESCE((SELECT "plan" = 'INDIVIDUAL' FROM "Subscription" WHERE "businessId" = NEW."businessId"), true)
    INTO business_only;
  IF EXISTS (
    SELECT 1 FROM "Appointment" a
    WHERE a."businessId" = NEW."businessId" AND a."id" <> NEW."id" AND a."status" <> 'CANCELLED'
      AND a."startTime" < NEW."endTime" AND a."endTime" > NEW."startTime"
      AND (
        ((business_only OR NEW."staffId" IS NULL) AND (a."locationId" = NEW."locationId" OR a."locationId" IS NULL OR NEW."locationId" IS NULL))
        OR (NOT business_only AND NEW."staffId" IS NOT NULL AND (
          a."staffId" = NEW."staffId" OR (a."staffId" IS NULL AND (a."locationId" = NEW."locationId" OR a."locationId" IS NULL OR NEW."locationId" IS NULL))
        ))
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23P01', MESSAGE = 'BOOKING_SLOT_CONFLICT';
  END IF;
  RETURN NEW;
END;
$$;
