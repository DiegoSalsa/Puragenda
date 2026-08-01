CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "staffId" TEXT,
  "userId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "googleEmail" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "calendarName" TEXT,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
  "includeCustomerAttendee" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "lastSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleCalendarEvent" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL,
  "googleEventId" TEXT NOT NULL,
  "googleEventUrl" TEXT,
  "etag" TEXT,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleCalendarConnection_businessId_scopeKey_key"
  ON "GoogleCalendarConnection"("businessId", "scopeKey");
CREATE INDEX "GoogleCalendarConnection_businessId_scope_syncEnabled_idx"
  ON "GoogleCalendarConnection"("businessId", "scope", "syncEnabled");
CREATE INDEX "GoogleCalendarConnection_staffId_syncEnabled_idx"
  ON "GoogleCalendarConnection"("staffId", "syncEnabled");
CREATE INDEX "GoogleCalendarConnection_userId_idx"
  ON "GoogleCalendarConnection"("userId");

CREATE UNIQUE INDEX "GoogleCalendarEvent_appointmentId_key"
  ON "GoogleCalendarEvent"("appointmentId");
CREATE UNIQUE INDEX "GoogleCalendarEvent_connectionId_calendarId_googleEventId_key"
  ON "GoogleCalendarEvent"("connectionId", "calendarId", "googleEventId");
CREATE INDEX "GoogleCalendarEvent_connectionId_idx"
  ON "GoogleCalendarEvent"("connectionId");
CREATE INDEX "GoogleCalendarEvent_lastSyncedAt_idx"
  ON "GoogleCalendarEvent"("lastSyncedAt");

ALTER TABLE "GoogleCalendarConnection"
  ADD CONSTRAINT "GoogleCalendarConnection_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarConnection"
  ADD CONSTRAINT "GoogleCalendarConnection_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarConnection"
  ADD CONSTRAINT "GoogleCalendarConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEvent"
  ADD CONSTRAINT "GoogleCalendarEvent_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleCalendarEvent"
  ADD CONSTRAINT "GoogleCalendarEvent_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "GoogleCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
