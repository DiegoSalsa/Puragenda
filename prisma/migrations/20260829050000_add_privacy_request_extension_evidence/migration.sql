-- Preserve the original deadline and evidence when the single statutory
-- extension is used for a non-blocking privacy request.
ALTER TABLE "PrivacyRequest"
  ADD COLUMN "initialDueAt" TIMESTAMP(3),
  ADD COLUMN "extensionUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "extensionNoticeSentAt" TIMESTAMP(3),
  ADD COLUMN "extensionNotes" TEXT;

UPDATE "PrivacyRequest"
SET "initialDueAt" = "dueAt"
WHERE "initialDueAt" IS NULL;
