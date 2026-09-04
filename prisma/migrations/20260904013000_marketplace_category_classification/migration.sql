-- Separate admin classification from SEO routes.
-- isActive = can be assigned to a listing.
-- seoEnabled = eligible for marketplace SEO paths (still fail-closed).

ALTER TABLE "MarketplaceCategory" ADD COLUMN "seoEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "MarketplaceCategory_seoEnabled_position_idx" ON "MarketplaceCategory"("seoEnabled", "position");

UPDATE "MarketplaceCategory"
SET "seoEnabled" = true
WHERE "slug" IN ('barberias', 'peluquerias');

UPDATE "MarketplaceCategory"
SET "isActive" = true
WHERE "slug" = 'manicure';

INSERT INTO "MarketplaceCategory" ("id", "slug", "name", "isActive", "seoEnabled", "position", "createdAt", "updatedAt")
VALUES ('mcat_bienestar', 'bienestar', 'Bienestar', true, false, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
