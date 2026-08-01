-- CreateTable
CREATE TABLE "ClientPortalToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalToken_tokenHash_key" ON "ClientPortalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ClientPortalToken_email_createdAt_idx" ON "ClientPortalToken"("email", "createdAt");

-- CreateIndex
CREATE INDEX "ClientPortalToken_expiresAt_idx" ON "ClientPortalToken"("expiresAt");

-- Supabase exposes the public schema through its Data API. The portal uses
-- server-side Prisma only, so no anon/authenticated policy is intentionally added.
ALTER TABLE "ClientPortalToken" ENABLE ROW LEVEL SECURITY;
