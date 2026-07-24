CREATE TYPE "ServiceBookingMode" AS ENUM ('APPOINTMENT', 'PRODUCTION');
CREATE TYPE "ProductionOrderStatus" AS ENUM (
  'AWAITING_DEPOSIT',
  'REFERENCES_REVIEW',
  'QUEUED',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'BALANCE_DUE',
  'READY_TO_SHIP',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED'
);

ALTER TABLE "Service"
  ADD COLUMN "bookingMode" "ServiceBookingMode" NOT NULL DEFAULT 'APPOINTMENT',
  ADD COLUMN "weeklyProductionCapacity" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "productionWeeksAhead" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "productionDepositPercent" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "requiresReferenceImages" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_weeklyProductionCapacity_check"
  CHECK ("weeklyProductionCapacity" BETWEEN 1 AND 100),
  ADD CONSTRAINT "Service_productionWeeksAhead_check"
  CHECK ("productionWeeksAhead" BETWEEN 4 AND 52),
  ADD CONSTRAINT "Service_productionDepositPercent_check"
  CHECK ("productionDepositPercent" BETWEEN 0 AND 100);

CREATE TABLE "ProductionOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "clientId" TEXT,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "petName" TEXT NOT NULL,
  "petDetails" TEXT NOT NULL,
  "referenceImageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "productionWeek" DATE NOT NULL,
  "selectedOptions" JSONB,
  "totalPrice" DOUBLE PRECISION NOT NULL,
  "depositAmount" INTEGER NOT NULL,
  "balanceAmount" INTEGER NOT NULL,
  "depositPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "balancePaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE',
  "deliveryMethod" TEXT NOT NULL DEFAULT 'COORDINATE',
  "customerAddress" TEXT,
  "status" "ProductionOrderStatus" NOT NULL DEFAULT 'AWAITING_DEPOSIT',
  "internalNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionOrder_amounts_check"
    CHECK ("totalPrice" >= 0 AND "depositAmount" >= 0 AND "balanceAmount" >= 0)
);

CREATE UNIQUE INDEX "ProductionOrder_orderNumber_key" ON "ProductionOrder"("orderNumber");
CREATE INDEX "ProductionOrder_businessId_status_idx" ON "ProductionOrder"("businessId", "status");
CREATE INDEX "ProductionOrder_serviceId_productionWeek_idx" ON "ProductionOrder"("serviceId", "productionWeek");
CREATE INDEX "ProductionOrder_clientId_idx" ON "ProductionOrder"("clientId");
CREATE INDEX "ProductionOrder_businessId_productionWeek_idx" ON "ProductionOrder"("businessId", "productionWeek");

ALTER TABLE "ProductionOrder"
  ADD CONSTRAINT "ProductionOrder_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionOrder_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductionOrder_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductionOrder" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "ProductionOrder" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "ProductionOrder" FROM authenticated;
  END IF;
END
$$;
