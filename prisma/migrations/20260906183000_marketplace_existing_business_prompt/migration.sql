-- Persist dashboard prompt dismissal across sessions and devices.
-- Existing Marketplace RLS and grants remain unchanged: this adds no table.

ALTER TABLE "Business" ADD COLUMN "marketplacePromptDismissedAt" TIMESTAMP(3);
