-- Operational marketplace status is independent from subscription/plan.
-- Historical listings stay PENDING_REVIEW so Admin decides who is ACTIVE.
-- Do not backfill ACTIVE from authorization, publication or billing state.

CREATE TYPE "MarketplaceListingStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'EXCLUDED');

ALTER TABLE "MarketplaceListing"
ADD COLUMN "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'PENDING_REVIEW';

CREATE INDEX "MarketplaceListing_status_publishedAt_idx"
ON "MarketplaceListing"("status", "publishedAt");
