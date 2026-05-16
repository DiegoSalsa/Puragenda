-- ============================================================
-- Sesion A: Reservas Recurrentes + CRM Light
-- Fecha: 2026-05-15
-- ============================================================

-- CreateEnum: RecurringMode
DO $$ BEGIN
  CREATE TYPE "RecurringMode" AS ENUM ('FIXED_DAYS', 'DAYS_WITH_REST', 'FREE_MINIMUM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: RecurringStatus
DO $$ BEGIN
  CREATE TYPE "RecurringStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Business - agregar campos de politicas del negocio
ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "requiresClientRut"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "allowRescheduling"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rescheduleHoursLimit"  INTEGER NOT NULL DEFAULT 24;

-- AlterTable: Client - agregar RUT y notas privadas (CRM light)
ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "rut"          TEXT,
  ADD COLUMN IF NOT EXISTS "privateNotes" TEXT;

-- AlterTable: Appointment - agregar FK a RecurringBooking
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "recurringBookingId" TEXT;

-- CreateTable: RecurringPlan
CREATE TABLE IF NOT EXISTS "RecurringPlan" (
    "id"                    TEXT NOT NULL,
    "serviceId"             TEXT NOT NULL,
    "mode"                  "RecurringMode" NOT NULL DEFAULT 'FIXED_DAYS',
    "fixedDays"             INTEGER[] NOT NULL DEFAULT '{}',
    "daysPerWeek"           INTEGER,
    "minRestDays"           INTEGER,
    "durationOptions"       INTEGER[] NOT NULL DEFAULT '{1}',
    "startDateRangeDays"    INTEGER NOT NULL DEFAULT 14,
    "requiresApproval"      BOOLEAN NOT NULL DEFAULT false,
    "requiresHealthForm"    BOOLEAN NOT NULL DEFAULT false,
    "healthQuestions"       TEXT[] NOT NULL DEFAULT '{}',
    "requiresRut"           BOOLEAN NOT NULL DEFAULT false,
    "renewalMessage"        TEXT,
    "expirationWarningDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RecurringBooking
CREATE TABLE IF NOT EXISTS "RecurringBooking" (
    "id"                      TEXT NOT NULL,
    "businessId"              TEXT NOT NULL,
    "serviceId"               TEXT NOT NULL,
    "recurringPlanId"         TEXT NOT NULL,
    "staffId"                 TEXT,
    "clientId"                TEXT,
    "customerName"            TEXT NOT NULL,
    "customerEmail"           TEXT NOT NULL,
    "customerPhone"           TEXT,
    "customerRut"             TEXT,
    "status"                  "RecurringStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "selectedDays"            INTEGER[] NOT NULL,
    "selectedTimes"           JSONB NOT NULL,
    "startDate"               TIMESTAMP(3) NOT NULL,
    "endDate"                 TIMESTAMP(3) NOT NULL,
    "durationMonths"          INTEGER NOT NULL,
    "healthAnswers"           JSONB,
    "healthFreeText"          TEXT,
    "healthAccepted"          BOOLEAN NOT NULL DEFAULT false,
    "pausedUntil"             TIMESTAMP(3),
    "internalNotes"           TEXT,
    "expirationWarningSent"   BOOLEAN NOT NULL DEFAULT false,
    "renewalOffered"          BOOLEAN NOT NULL DEFAULT false,
    "managementToken"         TEXT,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RecurringSessionOverride
CREATE TABLE IF NOT EXISTS "RecurringSessionOverride" (
    "id"                  TEXT NOT NULL,
    "recurringBookingId"  TEXT NOT NULL,
    "originalDate"        TIMESTAMP(3) NOT NULL,
    "action"              TEXT NOT NULL,
    "newTime"             TEXT,
    "reason"              TEXT,
    "requestedByClient"   BOOLEAN NOT NULL DEFAULT false,
    "warningSent"         BOOLEAN NOT NULL DEFAULT false,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringSessionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: RecurringPlan
CREATE UNIQUE INDEX IF NOT EXISTS "RecurringPlan_serviceId_key" ON "RecurringPlan"("serviceId");
CREATE INDEX IF NOT EXISTS "RecurringPlan_serviceId_idx" ON "RecurringPlan"("serviceId");

-- CreateIndex: RecurringBooking
CREATE UNIQUE INDEX IF NOT EXISTS "RecurringBooking_managementToken_key" ON "RecurringBooking"("managementToken");
CREATE INDEX IF NOT EXISTS "RecurringBooking_businessId_idx" ON "RecurringBooking"("businessId");
CREATE INDEX IF NOT EXISTS "RecurringBooking_serviceId_idx" ON "RecurringBooking"("serviceId");
CREATE INDEX IF NOT EXISTS "RecurringBooking_staffId_idx" ON "RecurringBooking"("staffId");
CREATE INDEX IF NOT EXISTS "RecurringBooking_clientId_idx" ON "RecurringBooking"("clientId");
CREATE INDEX IF NOT EXISTS "RecurringBooking_status_idx" ON "RecurringBooking"("status");
CREATE INDEX IF NOT EXISTS "RecurringBooking_businessId_status_idx" ON "RecurringBooking"("businessId", "status");

-- CreateIndex: RecurringSessionOverride
CREATE INDEX IF NOT EXISTS "RecurringSessionOverride_recurringBookingId_idx" ON "RecurringSessionOverride"("recurringBookingId");
CREATE INDEX IF NOT EXISTS "RecurringSessionOverride_originalDate_idx" ON "RecurringSessionOverride"("originalDate");
CREATE INDEX IF NOT EXISTS "RecurringSessionOverride_recurringBookingId_originalDate_idx" ON "RecurringSessionOverride"("recurringBookingId", "originalDate");

-- CreateIndex: Appointment.recurringBookingId
CREATE INDEX IF NOT EXISTS "Appointment_recurringBookingId_idx" ON "Appointment"("recurringBookingId");

-- AddForeignKey: RecurringPlan -> Service
ALTER TABLE "RecurringPlan"
  DROP CONSTRAINT IF EXISTS "RecurringPlan_serviceId_fkey";
ALTER TABLE "RecurringPlan"
  ADD CONSTRAINT "RecurringPlan_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RecurringBooking -> Business
ALTER TABLE "RecurringBooking"
  DROP CONSTRAINT IF EXISTS "RecurringBooking_businessId_fkey";
ALTER TABLE "RecurringBooking"
  ADD CONSTRAINT "RecurringBooking_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RecurringBooking -> Service
ALTER TABLE "RecurringBooking"
  DROP CONSTRAINT IF EXISTS "RecurringBooking_serviceId_fkey";
ALTER TABLE "RecurringBooking"
  ADD CONSTRAINT "RecurringBooking_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RecurringBooking -> RecurringPlan
ALTER TABLE "RecurringBooking"
  DROP CONSTRAINT IF EXISTS "RecurringBooking_recurringPlanId_fkey";
ALTER TABLE "RecurringBooking"
  ADD CONSTRAINT "RecurringBooking_recurringPlanId_fkey"
  FOREIGN KEY ("recurringPlanId") REFERENCES "RecurringPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RecurringBooking -> Staff
ALTER TABLE "RecurringBooking"
  DROP CONSTRAINT IF EXISTS "RecurringBooking_staffId_fkey";
ALTER TABLE "RecurringBooking"
  ADD CONSTRAINT "RecurringBooking_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: RecurringBooking -> Client
ALTER TABLE "RecurringBooking"
  DROP CONSTRAINT IF EXISTS "RecurringBooking_clientId_fkey";
ALTER TABLE "RecurringBooking"
  ADD CONSTRAINT "RecurringBooking_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: RecurringSessionOverride -> RecurringBooking
ALTER TABLE "RecurringSessionOverride"
  DROP CONSTRAINT IF EXISTS "RecurringSessionOverride_recurringBookingId_fkey";
ALTER TABLE "RecurringSessionOverride"
  ADD CONSTRAINT "RecurringSessionOverride_recurringBookingId_fkey"
  FOREIGN KEY ("recurringBookingId") REFERENCES "RecurringBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Appointment -> RecurringBooking
ALTER TABLE "Appointment"
  DROP CONSTRAINT IF EXISTS "Appointment_recurringBookingId_fkey";
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_recurringBookingId_fkey"
  FOREIGN KEY ("recurringBookingId") REFERENCES "RecurringBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
