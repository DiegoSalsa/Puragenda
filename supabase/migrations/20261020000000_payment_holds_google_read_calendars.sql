ALTER TABLE "Appointment" ADD COLUMN "paymentHoldExpiresAt" TIMESTAMP(3);
CREATE INDEX "Appointment_businessId_status_paymentHoldExpiresAt_idx"
  ON "Appointment"("businessId", "status", "paymentHoldExpiresAt");

CREATE TABLE "GoogleCalendarReadSelection" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL,
  "calendarName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarReadSelection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleCalendarReadSelection_connectionId_calendarId_key"
  ON "GoogleCalendarReadSelection"("connectionId", "calendarId");
CREATE INDEX "GoogleCalendarReadSelection_connectionId_idx"
  ON "GoogleCalendarReadSelection"("connectionId");
ALTER TABLE "GoogleCalendarReadSelection"
  ADD CONSTRAINT "GoogleCalendarReadSelection_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "GoogleCalendarReadSelection" ("id", "connectionId", "calendarId", "calendarName", "createdAt", "updatedAt")
SELECT 'gcrs_' || md5(gc."id" || ':' || gc."calendarId"), gc."id", gc."calendarId", gc."calendarName", gc."createdAt", gc."updatedAt"
FROM "GoogleCalendarConnection" gc
ON CONFLICT ("connectionId", "calendarId") DO NOTHING;
