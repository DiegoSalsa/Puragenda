ALTER TABLE "Business"
  ADD COLUMN "loyaltyCodePrefix" TEXT NOT NULL DEFAULT 'PREMIO';

ALTER TABLE "Service"
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked_services AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "businessId"
      ORDER BY "name" ASC, "id" ASC
    ) - 1 AS new_position
  FROM "Service"
)
UPDATE "Service" AS service
SET "position" = ranked_services.new_position
FROM ranked_services
WHERE service."id" = ranked_services."id";

CREATE INDEX "Service_businessId_position_idx"
  ON "Service"("businessId", "position");
