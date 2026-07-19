-- Passwordless access challenges for the SuperAdmin panel.
CREATE TABLE "AdminLoginCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminLoginCode_userId_createdAt_idx" ON "AdminLoginCode"("userId", "createdAt");
CREATE INDEX "AdminLoginCode_expiresAt_idx" ON "AdminLoginCode"("expiresAt");

ALTER TABLE "AdminLoginCode"
ADD CONSTRAINT "AdminLoginCode_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- This table contains authentication secrets and must never be exposed through the Data API.
ALTER TABLE "AdminLoginCode" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "AdminLoginCode" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "AdminLoginCode" FROM authenticated;
  END IF;
END
$$;
