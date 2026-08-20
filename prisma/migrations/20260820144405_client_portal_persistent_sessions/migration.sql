ALTER TABLE "ClientPortalAccount"
ADD COLUMN "rut" TEXT;

CREATE TABLE "ClientPortalSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientPortalSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientPortalSession_tokenHash_key"
ON "ClientPortalSession"("tokenHash");

CREATE INDEX "ClientPortalSession_accountId_expiresAt_idx"
ON "ClientPortalSession"("accountId", "expiresAt");

CREATE INDEX "ClientPortalSession_expiresAt_idx"
ON "ClientPortalSession"("expiresAt");

ALTER TABLE "ClientPortalSession"
ADD CONSTRAINT "ClientPortalSession_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientPortalSession" ENABLE ROW LEVEL SECURITY;
