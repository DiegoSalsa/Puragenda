-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "mcpPublicDiscovery" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "McpOAuthClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpOAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOAuthRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scopes" TEXT[],
    "state" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "csrfHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "McpOAuthRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,

    CONSTRAINT "McpProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpConnection" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scopes" TEXT[],
    "tokenVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "McpConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOAuthCode" (
    "hash" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "McpOAuthCode_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "McpOAuthToken" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accessHash" TEXT NOT NULL,
    "refreshHash" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "scopes" TEXT[],
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshUsedAt" TIMESTAMP(3),

    CONSTRAINT "McpOAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpOperation" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "connectionId" TEXT,
    "businessId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PREPARED',
    "result" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "McpOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpOAuthRequest_expiresAt_idx" ON "McpOAuthRequest"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOAuthRequest_clientId_idx" ON "McpOAuthRequest"("clientId");

-- CreateIndex
CREATE INDEX "McpProfile_businessId_idx" ON "McpProfile"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "McpProfile_userId_businessId_key" ON "McpProfile"("userId", "businessId");

-- CreateIndex
CREATE INDEX "McpConnection_profileId_revokedAt_idx" ON "McpConnection"("profileId", "revokedAt");

-- CreateIndex
CREATE INDEX "McpConnection_clientId_idx" ON "McpConnection"("clientId");

-- CreateIndex
CREATE INDEX "McpConnection_expiresAt_idx" ON "McpConnection"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOAuthCode_expiresAt_idx" ON "McpOAuthCode"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOAuthCode_connectionId_idx" ON "McpOAuthCode"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthToken_accessHash_key" ON "McpOAuthToken"("accessHash");

-- CreateIndex
CREATE UNIQUE INDEX "McpOAuthToken_refreshHash_key" ON "McpOAuthToken"("refreshHash");

-- CreateIndex
CREATE INDEX "McpOAuthToken_connectionId_idx" ON "McpOAuthToken"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "McpOperation_requestKey_key" ON "McpOperation"("requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "McpOperation_tokenHash_key" ON "McpOperation"("tokenHash");

-- CreateIndex
CREATE INDEX "McpOperation_expiresAt_idx" ON "McpOperation"("expiresAt");

-- CreateIndex
CREATE INDEX "McpOperation_connectionId_idx" ON "McpOperation"("connectionId");

-- CreateIndex
CREATE INDEX "McpOperation_businessId_idx" ON "McpOperation"("businessId");

-- AddForeignKey
ALTER TABLE "McpOAuthRequest" ADD CONSTRAINT "McpOAuthRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpProfile" ADD CONSTRAINT "McpProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpProfile" ADD CONSTRAINT "McpProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpConnection" ADD CONSTRAINT "McpConnection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "McpProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpConnection" ADD CONSTRAINT "McpConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "McpOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthCode" ADD CONSTRAINT "McpOAuthCode_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOAuthToken" ADD CONSTRAINT "McpOAuthToken_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOperation" ADD CONSTRAINT "McpOperation_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "McpConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpOperation" ADD CONSTRAINT "McpOperation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server-only credentials and operations: deny the Data API.
ALTER TABLE "McpOAuthClient" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthClient" FROM PUBLIC;
ALTER TABLE "McpOAuthRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthRequest" FROM PUBLIC;
ALTER TABLE "McpProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpProfile" FROM PUBLIC;
ALTER TABLE "McpConnection" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpConnection" FROM PUBLIC;
ALTER TABLE "McpOAuthCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthCode" FROM PUBLIC;
ALTER TABLE "McpOAuthToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOAuthToken" FROM PUBLIC;
ALTER TABLE "McpOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "McpOperation" FROM PUBLIC;
DO $$
DECLARE table_name text; role_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['McpOAuthClient','McpOAuthRequest','McpProfile','McpConnection','McpOAuthCode','McpOAuthToken','McpOperation'] LOOP
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, role_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;
