-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "WebsiteDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "DomainRequestStatus" AS ENUM ('REQUESTED', 'REVIEWING', 'QUOTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BusinessWebsite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL DEFAULT 'bella',
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "subdomain" TEXT NOT NULL,
    "draftConfig" JSONB NOT NULL,
    "publishedConfig" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "publishedRevision" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteDomain" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "status" "WebsiteDomainStatus" NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRequest" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "DomainRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteAddon" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'paddle',
    "paddleSubscriptionId" TEXT,
    "paddleCustomerId" TEXT,
    "paddlePriceId" TEXT,
    "checkoutTransactionId" TEXT,
    "validUntil" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3),
    "lastEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteBillingEvent" (
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteBillingEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWebsite_businessId_key" ON "BusinessWebsite"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWebsite_subdomain_key" ON "BusinessWebsite"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteDomain_hostname_key" ON "WebsiteDomain"("hostname");

-- CreateIndex
CREATE INDEX "WebsiteDomain_websiteId_status_idx" ON "WebsiteDomain"("websiteId", "status");

-- CreateIndex
CREATE INDEX "DomainRequest_websiteId_status_idx" ON "DomainRequest"("websiteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAddon_businessId_key" ON "WebsiteAddon"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAddon_paddleSubscriptionId_key" ON "WebsiteAddon"("paddleSubscriptionId");

-- AddForeignKey
ALTER TABLE "BusinessWebsite" ADD CONSTRAINT "BusinessWebsite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteDomain" ADD CONSTRAINT "WebsiteDomain_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "BusinessWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainRequest" ADD CONSTRAINT "DomainRequest_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "BusinessWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteAddon" ADD CONSTRAINT "WebsiteAddon_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server-only persistence. No policies for browser/Data API roles; Prisma uses
-- the privileged application connection. Never expose drafts or billing state.
ALTER TABLE "BusinessWebsite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteDomain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DomainRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteAddon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebsiteBillingEvent" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "BusinessWebsite", "WebsiteDomain", "DomainRequest", "WebsiteAddon", "WebsiteBillingEvent" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "BusinessWebsite", "WebsiteDomain", "DomainRequest", "WebsiteAddon", "WebsiteBillingEvent" FROM authenticated;
  END IF;
END $$;
CREATE UNIQUE INDEX "WebsiteDomain_one_primary" ON "WebsiteDomain" ("websiteId") WHERE "isPrimary";
ALTER TABLE "BusinessWebsite" ADD CONSTRAINT "website_published_snapshot" CHECK ("status" <> 'PUBLISHED' OR ("publishedConfig" IS NOT NULL AND "publishedAt" IS NOT NULL));
ALTER TABLE "BusinessWebsite" ADD CONSTRAINT "website_subdomain_format" CHECK ("subdomain" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');
ALTER TABLE "WebsiteDomain" ADD CONSTRAINT "website_domain_lowercase" CHECK ("hostname" = lower("hostname"));
