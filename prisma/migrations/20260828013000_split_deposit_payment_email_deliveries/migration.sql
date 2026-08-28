-- Track every recipient independently. A partial email failure must not cause
-- already accepted recipient messages to be replayed on the next retry.
ALTER TABLE "DepositPaymentDelivery"
  ADD COLUMN "ownerEmailDeliveredAt" TIMESTAMP(3),
  ADD COLUMN "staffEmailDeliveredAt" TIMESTAMP(3),
  ADD COLUMN "customerEmailDeliveredAt" TIMESTAMP(3);

-- The prior flag represented a completed owner/staff/customer batch. Preserve
-- that meaning for rows created before this migration.
UPDATE "DepositPaymentDelivery"
SET
  "ownerEmailDeliveredAt" = "notificationsDeliveredAt",
  "staffEmailDeliveredAt" = "notificationsDeliveredAt",
  "customerEmailDeliveredAt" = "notificationsDeliveredAt"
WHERE "notificationsDeliveredAt" IS NOT NULL;

ALTER TABLE "DepositPaymentDelivery"
  DROP COLUMN "notificationsDeliveredAt";

-- The worker only scans unfinished rows. This partial index keeps recovery
-- scans small as the delivery history grows.
CREATE INDEX "DepositPaymentDelivery_pending_nextAttemptAt_idx"
ON "DepositPaymentDelivery" ("nextAttemptAt")
WHERE "ownerEmailDeliveredAt" IS NULL
   OR "staffEmailDeliveredAt" IS NULL
   OR "customerEmailDeliveredAt" IS NULL
   OR "calendarSyncedAt" IS NULL;
