-- Multi-sucursal. This is intentionally an expand migration: locationId stays
-- nullable while the application and historical data transition to locations.

CREATE TABLE "BusinessLocation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "address" TEXT,
  "mapsUrl" TEXT,
  "timezone" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessLocation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LocationHours" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "breakStart" TEXT,
  "breakEnd" TEXT,
  CONSTRAINT "LocationHours_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocationHours_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LocationScheduleOverride" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "breakStart" TEXT,
  "breakEnd" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationScheduleOverride_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LocationScheduleOverride_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LocationService" (
  "locationId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationService_pkey" PRIMARY KEY ("locationId", "serviceId"),
  CONSTRAINT "LocationService_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LocationService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StaffLocation" (
  "id" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffLocation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StaffLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StaffLocationSchedule" (
  "id" TEXT NOT NULL,
  "staffLocationId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "isWorking" BOOLEAN NOT NULL DEFAULT true,
  "breakStart" TEXT,
  "breakEnd" TEXT,
  CONSTRAINT "StaffLocationSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StaffLocationSchedule_staffLocationId_fkey" FOREIGN KEY ("staffLocationId") REFERENCES "StaffLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BusinessLocation_businessId_slug_key" ON "BusinessLocation"("businessId", "slug");
CREATE UNIQUE INDEX "BusinessLocation_one_primary_per_business" ON "BusinessLocation"("businessId") WHERE "isPrimary";
CREATE INDEX "BusinessLocation_businessId_isActive_position_idx" ON "BusinessLocation"("businessId", "isActive", "position");
CREATE UNIQUE INDEX "LocationHours_locationId_dayOfWeek_key" ON "LocationHours"("locationId", "dayOfWeek");
CREATE INDEX "LocationHours_locationId_idx" ON "LocationHours"("locationId");
CREATE UNIQUE INDEX "LocationScheduleOverride_locationId_date_key" ON "LocationScheduleOverride"("locationId", "date");
CREATE INDEX "LocationScheduleOverride_locationId_date_idx" ON "LocationScheduleOverride"("locationId", "date");
CREATE INDEX "LocationService_serviceId_idx" ON "LocationService"("serviceId");
CREATE UNIQUE INDEX "StaffLocation_staffId_locationId_key" ON "StaffLocation"("staffId", "locationId");
CREATE INDEX "StaffLocation_locationId_isActive_idx" ON "StaffLocation"("locationId", "isActive");
CREATE UNIQUE INDEX "StaffLocationSchedule_staffLocationId_dayOfWeek_key" ON "StaffLocationSchedule"("staffLocationId", "dayOfWeek");
CREATE INDEX "StaffLocationSchedule_staffLocationId_idx" ON "StaffLocationSchedule"("staffLocationId");

-- Every existing business gets a usable primary location, and all existing
-- scheduling data is associated with it before application code switches over.
INSERT INTO "BusinessLocation" ("id", "businessId", "name", "slug", "address", "mapsUrl", "timezone", "isPrimary", "isActive", "position", "createdAt", "updatedAt")
SELECT md5('location:' || b."id"), b."id", 'Local principal', 'principal', b."address", b."mapsUrl", b."timezone", true, true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Business" b;

INSERT INTO "LocationHours" ("id", "locationId", "dayOfWeek", "startTime", "endTime", "isOpen", "breakStart", "breakEnd")
SELECT md5('location-hours:' || h."id"), md5('location:' || h."businessId"), h."dayOfWeek", h."startTime", h."endTime", h."isOpen", h."breakStart", h."breakEnd"
FROM "BusinessHours" h;

INSERT INTO "LocationScheduleOverride" ("id", "locationId", "date", "startTime", "endTime", "isOpen", "breakStart", "breakEnd", "createdAt")
SELECT md5('location-override:' || o."id"), md5('location:' || o."businessId"), o."date", o."startTime", o."endTime", o."isOpen", o."breakStart", o."breakEnd", o."createdAt"
FROM "BusinessScheduleOverride" o;

INSERT INTO "LocationService" ("locationId", "serviceId")
SELECT md5('location:' || s."businessId"), s."id" FROM "Service" s;

INSERT INTO "StaffLocation" ("id", "staffId", "locationId", "isActive", "createdAt", "updatedAt")
SELECT md5('staff-location:' || s."id"), s."id", md5('location:' || s."businessId"), s."isActive", s."createdAt", s."updatedAt"
FROM "Staff" s;

INSERT INTO "StaffLocationSchedule" ("id", "staffLocationId", "dayOfWeek", "startTime", "endTime", "isWorking", "breakStart", "breakEnd")
SELECT md5('staff-location-schedule:' || ss."id"), md5('staff-location:' || ss."staffId"), ss."dayOfWeek", ss."startTime", ss."endTime", ss."isWorking", ss."breakStart", ss."breakEnd"
FROM "StaffSchedule" ss;

ALTER TABLE "Appointment" ADD COLUMN "locationId" TEXT;
ALTER TABLE "RecurringBooking" ADD COLUMN "locationId" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN "locationId" TEXT;
ALTER TABLE "ScheduleBlock" ADD COLUMN "locationId" TEXT;

UPDATE "Appointment" a SET "locationId" = md5('location:' || a."businessId");
UPDATE "RecurringBooking" r SET "locationId" = md5('location:' || r."businessId");
UPDATE "ProductionOrder" p SET "locationId" = md5('location:' || p."businessId");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringBooking" ADD CONSTRAINT "RecurringBooking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "BusinessLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Appointment_locationId_startTime_endTime_idx" ON "Appointment"("locationId", "startTime", "endTime");
CREATE INDEX "RecurringBooking_locationId_status_idx" ON "RecurringBooking"("locationId", "status");
CREATE INDEX "ProductionOrder_locationId_productionWeek_idx" ON "ProductionOrder"("locationId", "productionWeek");
CREATE INDEX "ScheduleBlock_locationId_idx" ON "ScheduleBlock"("locationId");

-- The application accesses these tables through Prisma/server routes. They must
-- not become readable through Supabase's public Data API.
ALTER TABLE "BusinessLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationHours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationScheduleOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LocationService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffLocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffLocationSchedule" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "BusinessLocation", "LocationHours", "LocationScheduleOverride", "LocationService", "StaffLocation", "StaffLocationSchedule" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "BusinessLocation", "LocationHours", "LocationScheduleOverride", "LocationService", "StaffLocation", "StaffLocationSchedule" FROM authenticated;
  END IF;
END $$;
