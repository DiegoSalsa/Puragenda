ALTER TABLE "WidgetPromoBlock"
ADD COLUMN "discountType" TEXT,
ADD COLUMN "discountValue" INTEGER,
ADD COLUMN "discountStartsAt" TIMESTAMP(3),
ADD COLUMN "discountEndsAt" TIMESTAMP(3),
ADD COLUMN "discountMinSubtotal" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Appointment"
ADD COLUMN "originalTotalPrice" DOUBLE PRECISION,
ADD COLUMN "discountAmount" DOUBLE PRECISION,
ADD COLUMN "promotionId" TEXT,
ADD COLUMN "promotionTitle" TEXT;

ALTER TABLE "WidgetPromoBlock"
ADD CONSTRAINT "WidgetPromoBlock_discount_config_check"
CHECK (
  ("discountType" IS NULL AND "discountValue" IS NULL)
  OR (
    "discountType" IN ('PERCENTAGE', 'FIXED')
    AND "discountValue" > 0
    AND ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100)
  )
);

ALTER TABLE "WidgetPromoBlock"
ADD CONSTRAINT "WidgetPromoBlock_discount_dates_check"
CHECK (
  "discountStartsAt" IS NULL
  OR "discountEndsAt" IS NULL
  OR "discountStartsAt" < "discountEndsAt"
);

ALTER TABLE "WidgetPromoBlock"
ADD CONSTRAINT "WidgetPromoBlock_discount_min_subtotal_check"
CHECK ("discountMinSubtotal" >= 0);

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_promotionId_fkey"
FOREIGN KEY ("promotionId") REFERENCES "WidgetPromoBlock"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WidgetPromoBlock_discount_active_idx"
ON "WidgetPromoBlock"("businessId", "isVisible", "discountStartsAt", "discountEndsAt");

CREATE INDEX "Appointment_promotionId_idx"
ON "Appointment"("promotionId");
