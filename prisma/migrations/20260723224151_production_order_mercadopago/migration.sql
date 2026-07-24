ALTER TABLE "ProductionOrder"
  ADD COLUMN "depositMpPreferenceId" TEXT,
  ADD COLUMN "depositMpPaymentId" TEXT,
  ADD COLUMN "balanceMpPreferenceId" TEXT,
  ADD COLUMN "balanceMpPaymentId" TEXT;

CREATE INDEX "ProductionOrder_depositMpPreferenceId_idx"
  ON "ProductionOrder"("depositMpPreferenceId");
