-- Persist in-person payment attempts independently from deposit state so the
-- same ledger can later support Mercado Pago Point without changing bookings.
CREATE TYPE "PosPaymentChannel" AS ENUM ('QR', 'POINT');
CREATE TYPE "PosPaymentStatus" AS ENUM (
  'CREATING',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
  'FAILED'
);

CREATE TABLE "PosPayment" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "channel" "PosPaymentChannel" NOT NULL DEFAULT 'QR',
  "status" "PosPaymentStatus" NOT NULL DEFAULT 'CREATING',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "externalReference" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "providerOrderId" TEXT,
  "providerPaymentId" TEXT,
  "providerUserId" TEXT,
  "qrData" TEXT,
  "statusDetail" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PosPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PosPayment_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "PosPayment_currency_format" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE UNIQUE INDEX "PosPayment_externalReference_key" ON "PosPayment"("externalReference");
CREATE UNIQUE INDEX "PosPayment_idempotencyKey_key" ON "PosPayment"("idempotencyKey");
CREATE UNIQUE INDEX "PosPayment_providerOrderId_key" ON "PosPayment"("providerOrderId");
CREATE INDEX "PosPayment_businessId_status_createdAt_idx" ON "PosPayment"("businessId", "status", "createdAt");
CREATE INDEX "PosPayment_appointmentId_status_createdAt_idx" ON "PosPayment"("appointmentId", "status", "createdAt");
CREATE INDEX "PosPayment_createdByUserId_idx" ON "PosPayment"("createdByUserId");
CREATE UNIQUE INDEX "PosPayment_one_active_per_appointment_idx"
  ON "PosPayment"("appointmentId")
  WHERE "status" IN ('CREATING', 'PENDING');

ALTER TABLE "PosPayment"
  ADD CONSTRAINT "PosPayment_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPayment"
  ADD CONSTRAINT "PosPayment_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PosPayment"
  ADD CONSTRAINT "PosPayment_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma is the only intended access path. Keep the public Data API closed.
ALTER TABLE "PosPayment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "PosPayment" FROM anon, authenticated;
