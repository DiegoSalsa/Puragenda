-- Optional eligibility window for first-payment campaigns aimed at trials.
ALTER TABLE "PlatformDiscountCode"
  ADD COLUMN "trialEndsAtFrom" TIMESTAMP(3),
  ADD COLUMN "trialEndsAtTo" TIMESTAMP(3);

-- September launch: only first-payment users whose trial ends during
-- September in America/Santiago may redeem VIVACHILE18. The campaign itself
-- also starts and expires at the Chilean calendar-day boundaries.
UPDATE "PlatformDiscountCode"
SET
  "startsAt" = TIMESTAMP '2026-09-01 04:00:00.000',
  "expiresAt" = TIMESTAMP '2026-10-01 02:59:59.999',
  "trialEndsAtFrom" = TIMESTAMP '2026-09-01 04:00:00.000',
  "trialEndsAtTo" = TIMESTAMP '2026-10-01 02:59:59.999'
WHERE "code" = 'VIVACHILE18'
  AND "discountType" = 'PERCENTAGE'
  AND "discountValue" = 18;
