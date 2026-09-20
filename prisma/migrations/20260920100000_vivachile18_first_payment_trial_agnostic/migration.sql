-- VIVACHILE18 is a first-real-payment campaign. A prior trial or free-month
-- benefit must not make an otherwise unpaid account ineligible.
-- Keep the optional trial window available for other campaigns.
UPDATE "PlatformDiscountCode"
SET
  "trialEndsAtFrom" = NULL,
  "trialEndsAtTo" = NULL
WHERE "code" = 'VIVACHILE18'
  AND "discountType" = 'PERCENTAGE'
  AND "discountValue" = 18;
