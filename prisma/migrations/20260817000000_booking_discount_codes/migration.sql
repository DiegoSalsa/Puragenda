-- Business-scoped discount codes for appointment bookings.
CREATE TYPE "BookingDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

CREATE TABLE "BookingDiscountCode" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "discountType" "BookingDiscountType" NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "minSubtotal" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingDiscountCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingDiscountCode_code_check" CHECK ("code" ~ '^[A-Z0-9]([A-Z0-9_-]{0,48}[A-Z0-9])?$'),
  CONSTRAINT "BookingDiscountCode_value_check" CHECK (
    "discountValue" > 0
    AND ("discountType" <> 'PERCENTAGE' OR "discountValue" <= 100)
  ),
  CONSTRAINT "BookingDiscountCode_minSubtotal_check" CHECK ("minSubtotal" >= 0),
  CONSTRAINT "BookingDiscountCode_dates_check" CHECK (
    "startsAt" IS NULL OR "expiresAt" IS NULL OR "startsAt" < "expiresAt"
  )
);

CREATE UNIQUE INDEX "BookingDiscountCode_businessId_code_key"
  ON "BookingDiscountCode"("businessId", "code");
CREATE INDEX "BookingDiscountCode_businessId_isActive_startsAt_expiresAt_idx"
  ON "BookingDiscountCode"("businessId", "isActive", "startsAt", "expiresAt");

ALTER TABLE "BookingDiscountCode"
  ADD CONSTRAINT "BookingDiscountCode_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment"
  ADD COLUMN "bookingDiscountCodeId" TEXT,
  ADD COLUMN "bookingDiscountCodeValue" TEXT;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_bookingDiscountCodeId_fkey"
  FOREIGN KEY ("bookingDiscountCodeId") REFERENCES "BookingDiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Appointment_bookingDiscountCodeId_idx"
  ON "Appointment"("bookingDiscountCodeId");

-- Prisma is the only intended access path. Keep the public Data API closed.
ALTER TABLE "BookingDiscountCode" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "BookingDiscountCode" FROM anon, authenticated;
