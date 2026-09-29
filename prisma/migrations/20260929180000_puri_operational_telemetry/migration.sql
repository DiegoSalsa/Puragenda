CREATE TABLE "PuriRequest" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "businessLocationId" TEXT,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "model" TEXT,
  "intent" TEXT NOT NULL DEFAULT 'unknown',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "errorCode" TEXT,
  "totalDurationMs" INTEGER,
  "modelDurationMs" INTEGER,
  "toolsDurationMs" INTEGER,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "cachedTokens" INTEGER NOT NULL DEFAULT 0,
  "estimatedCostUsd" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PuriRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PuriToolCall" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "toolName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "errorCode" TEXT,
  "resultCount" INTEGER,
  "durationMs" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PuriToolCall_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PuriFeedback" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rating" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PuriFeedback_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PuriUiEvent" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "businessLocationId" TEXT,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "errorCode" TEXT,
  "actionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PuriUiEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PuriFeedback_requestId_key" ON "PuriFeedback"("requestId");
CREATE INDEX "PuriRequest_createdAt_idx" ON "PuriRequest"("createdAt");
CREATE INDEX "PuriRequest_businessId_createdAt_idx" ON "PuriRequest"("businessId", "createdAt");
CREATE INDEX "PuriRequest_userId_businessId_createdAt_idx" ON "PuriRequest"("userId", "businessId", "createdAt");
CREATE INDEX "PuriRequest_businessLocationId_createdAt_idx" ON "PuriRequest"("businessLocationId", "createdAt");
CREATE INDEX "PuriRequest_intent_createdAt_idx" ON "PuriRequest"("intent", "createdAt");
CREATE INDEX "PuriRequest_status_createdAt_idx" ON "PuriRequest"("status", "createdAt");
CREATE INDEX "PuriToolCall_toolName_requestId_idx" ON "PuriToolCall"("toolName", "requestId");
CREATE INDEX "PuriToolCall_requestId_idx" ON "PuriToolCall"("requestId");
CREATE INDEX "PuriFeedback_createdAt_idx" ON "PuriFeedback"("createdAt");
CREATE INDEX "PuriUiEvent_event_createdAt_idx" ON "PuriUiEvent"("event", "createdAt");
CREATE INDEX "PuriUiEvent_businessId_event_createdAt_idx" ON "PuriUiEvent"("businessId", "event", "createdAt");
ALTER TABLE "PuriToolCall" ADD CONSTRAINT "PuriToolCall_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PuriRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PuriFeedback" ADD CONSTRAINT "PuriFeedback_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PuriRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes public schema tables through its Data API when grants allow it.
-- These server-only telemetry tables have no client policies.
ALTER TABLE "PuriRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriToolCall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriFeedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PuriUiEvent" ENABLE ROW LEVEL SECURITY;
