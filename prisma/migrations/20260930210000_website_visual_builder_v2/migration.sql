CREATE TABLE "WebsiteMedia" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "websiteId" TEXT NOT NULL REFERENCES "BusinessWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "publicId" TEXT NOT NULL UNIQUE,
  "secureUrl" TEXT NOT NULL UNIQUE,
  "width" INTEGER NOT NULL CHECK ("width" > 0),
  "height" INTEGER NOT NULL CHECK ("height" > 0),
  "format" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL CHECK ("bytes" > 0),
  "usage" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'cloudinary',
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "WebsiteMedia_websiteId_deletedAt_idx" ON "WebsiteMedia"("websiteId", "deletedAt");
ALTER TABLE "WebsiteDomain" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "dnsRecords" JSONB NOT NULL DEFAULT '[]', ADD COLUMN "checkedAt" TIMESTAMP(3);
ALTER TABLE "WebsiteMedia" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "WebsiteMedia" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "WebsiteMedia" FROM authenticated; END IF;
END $$;
