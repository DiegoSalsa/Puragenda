-- Persistent, revocable SuperAdmin sessions (one row per browser/device).
-- Authentication secrets live only as a SHA-256 hash; the raw cookie token is never stored.
CREATE TABLE "SuperAdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAuthAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "rememberDevice" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SuperAdminSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuperAdminSession_tokenHash_key" ON "SuperAdminSession"("tokenHash");
CREATE INDEX "SuperAdminSession_userId_expiresAt_idx" ON "SuperAdminSession"("userId", "expiresAt");
CREATE INDEX "SuperAdminSession_userId_revokedAt_idx" ON "SuperAdminSession"("userId", "revokedAt");
CREATE INDEX "SuperAdminSession_expiresAt_idx" ON "SuperAdminSession"("expiresAt");

ALTER TABLE "SuperAdminSession"
ADD CONSTRAINT "SuperAdminSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- This table contains authentication secrets and must never be exposed through the Data API.
ALTER TABLE "SuperAdminSession" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "SuperAdminSession" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "SuperAdminSession" FROM authenticated;
  END IF;
END
$$;
