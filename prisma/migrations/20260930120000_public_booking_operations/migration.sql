CREATE TABLE "BookingOperation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "keyHash" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "ownerToken" TEXT NOT NULL,
  "leaseUntil" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  -- A snapshot reference intentionally survives legacy physical appointment
  -- deletion, so the same operation can never become executable again.
  "appointmentId" TEXT,
  "response" JSONB,
  "httpStatus" INTEGER,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "BookingOperation_businessId_keyHash_key" ON "BookingOperation"("businessId", "keyHash");
CREATE UNIQUE INDEX "BookingOperation_appointmentId_key" ON "BookingOperation"("appointmentId");
CREATE INDEX "BookingOperation_expiresAt_idx" ON "BookingOperation"("expiresAt");

-- Server-only operation snapshots must not be exposed by Supabase's Data API.
ALTER TABLE "BookingOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BookingOperation" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "BookingOperation" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "BookingOperation" FROM authenticated;
  END IF;
END
$$;

-- All appointment writers (dashboard, widget, recurring, external API) share this
-- final guard. No network calls under the lock, and no validation of old rows.
CREATE OR REPLACE FUNCTION puragenda_guard_appointment_capacity() RETURNS trigger
LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE business_only boolean;
BEGIN
  IF NEW."status" = 'CANCELLED' THEN RETURN NEW; END IF;
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
CREATE TRIGGER "Appointment_capacity_guard"
BEFORE INSERT OR UPDATE OF "businessId", "locationId", "staffId", "startTime", "endTime", "status"
ON "Appointment" FOR EACH ROW EXECUTE FUNCTION puragenda_guard_appointment_capacity();
