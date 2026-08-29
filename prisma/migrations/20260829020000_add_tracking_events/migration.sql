-- Minimal, consent-gated product analytics. The event payload is restricted by
-- the application and must never contain customer or authentication data.
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "businessId" TEXT,
    "path" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TrackingEvent_occurredAt_idx" ON "TrackingEvent"("occurredAt");
CREATE INDEX "TrackingEvent_event_occurredAt_idx" ON "TrackingEvent"("event", "occurredAt");
CREATE INDEX "TrackingEvent_visitorId_occurredAt_idx" ON "TrackingEvent"("visitorId", "occurredAt");
CREATE INDEX "TrackingEvent_sessionId_occurredAt_idx" ON "TrackingEvent"("sessionId", "occurredAt");
CREATE INDEX "TrackingEvent_userId_occurredAt_idx" ON "TrackingEvent"("userId", "occurredAt");
CREATE INDEX "TrackingEvent_businessId_event_occurredAt_idx" ON "TrackingEvent"("businessId", "event", "occurredAt");
