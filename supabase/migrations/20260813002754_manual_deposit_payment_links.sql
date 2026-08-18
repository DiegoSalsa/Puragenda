CREATE TYPE "DepositPaymentMode" AS ENUM ('MERCADOPAGO', 'MANUAL_LINK');

ALTER TABLE "Business"
  ADD COLUMN "depositPaymentMode" "DepositPaymentMode" NOT NULL DEFAULT 'MERCADOPAGO';

ALTER TABLE "Service"
  ADD COLUMN "depositPaymentUrl" TEXT;

ALTER TABLE "Appointment"
  ADD COLUMN "depositPaymentUrl" TEXT;
