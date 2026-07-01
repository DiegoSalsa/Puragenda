-- SuperAdmin interactive email campaigns and responses.
CREATE TABLE IF NOT EXISTS "AdminInteractiveCampaign" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "fields" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminInteractiveCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminInteractiveRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "businessName" TEXT,
  "businessSlug" TEXT,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "AdminInteractiveRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminInteractiveResponse" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "rating" INTEGER,
  "answers" JSONB,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminInteractiveResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminInteractiveCampaign_type_idx" ON "AdminInteractiveCampaign"("type");
CREATE INDEX IF NOT EXISTS "AdminInteractiveCampaign_createdAt_idx" ON "AdminInteractiveCampaign"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminInteractiveRecipient_token_key" ON "AdminInteractiveRecipient"("token");
CREATE INDEX IF NOT EXISTS "AdminInteractiveRecipient_campaignId_idx" ON "AdminInteractiveRecipient"("campaignId");
CREATE INDEX IF NOT EXISTS "AdminInteractiveRecipient_email_idx" ON "AdminInteractiveRecipient"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminInteractiveResponse_recipientId_key" ON "AdminInteractiveResponse"("recipientId");
CREATE INDEX IF NOT EXISTS "AdminInteractiveResponse_campaignId_idx" ON "AdminInteractiveResponse"("campaignId");
CREATE INDEX IF NOT EXISTS "AdminInteractiveResponse_createdAt_idx" ON "AdminInteractiveResponse"("createdAt");

DO $$ BEGIN
  ALTER TABLE "AdminInteractiveCampaign"
    ADD CONSTRAINT "AdminInteractiveCampaign_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AdminInteractiveRecipient"
    ADD CONSTRAINT "AdminInteractiveRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "AdminInteractiveCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AdminInteractiveResponse"
    ADD CONSTRAINT "AdminInteractiveResponse_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "AdminInteractiveCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AdminInteractiveResponse"
    ADD CONSTRAINT "AdminInteractiveResponse_recipientId_fkey"
    FOREIGN KEY ("recipientId") REFERENCES "AdminInteractiveRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "AdminInteractiveCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminInteractiveRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminInteractiveResponse" ENABLE ROW LEVEL SECURITY;
