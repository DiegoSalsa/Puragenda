CREATE TYPE "ProductionScheduleMode" AS ENUM ('WEEKLY', 'CUSTOM');

ALTER TABLE "Business"
  ADD COLUMN "productionOrdersEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Service"
  ADD COLUMN "productionScheduleMode" "ProductionScheduleMode" NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN "productionLeadTimeWeeks" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "customProductionWindows" JSONB;

ALTER TABLE "Service"
  DROP CONSTRAINT "Service_productionWeeksAhead_check",
  ADD CONSTRAINT "Service_productionWeeksAhead_check"
    CHECK ("productionWeeksAhead" BETWEEN 1 AND 104),
  ADD CONSTRAINT "Service_productionLeadTimeWeeks_check"
  CHECK ("productionLeadTimeWeeks" BETWEEN 0 AND 104);

ALTER TABLE "ProductionOrder"
  ADD COLUMN "productionWindowKey" TEXT,
  ADD COLUMN "productionWindowLabel" TEXT,
  ADD COLUMN "productionWindowEnd" DATE;

CREATE INDEX "ProductionOrder_serviceId_productionWindowKey_idx"
  ON "ProductionOrder"("serviceId", "productionWindowKey");
