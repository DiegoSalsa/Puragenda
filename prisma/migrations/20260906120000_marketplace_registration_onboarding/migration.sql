-- Registration can prepare a MarketplaceListing without a canonical Chilean
-- locality (other countries, or "I can't find my city"). Classification-only
-- categories used in onboarding stay isActive and seoEnabled=false.

ALTER TABLE "MarketplaceListing" ALTER COLUMN "localityId" DROP NOT NULL;

ALTER TABLE "MarketplaceListing" ADD COLUMN "pendingCategoryDescription" TEXT;
ALTER TABLE "MarketplaceListing" ADD COLUMN "pendingLocalityName" TEXT;
ALTER TABLE "MarketplaceListing" ADD COLUMN "authorizationSource" TEXT;
ALTER TABLE "MarketplaceListing" ADD COLUMN "authorizationTextVersion" TEXT;
ALTER TABLE "MarketplaceListing" ADD COLUMN "authorizationRevokedAt" TIMESTAMP(3);

CREATE INDEX "MarketplaceListing_authorizationRevokedAt_idx" ON "MarketplaceListing"("authorizationRevokedAt");

-- Assignable in Admin / registration. Does not enable SEO routes.
UPDATE "MarketplaceCategory"
SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN ('estetica', 'psicologia', 'kinesiologia');

UPDATE "MarketplaceCategory"
SET "name" = 'Manicure / Nail Studio', "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'manicure';

INSERT INTO "MarketplaceCategory" ("id", "slug", "name", "isActive", "seoEnabled", "position", "createdAt", "updatedAt")
VALUES ('mcat_tatuajes', 'tatuajes', 'Tatuajes', true, false, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
