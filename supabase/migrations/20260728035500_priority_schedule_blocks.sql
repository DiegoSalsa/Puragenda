CREATE TYPE "ScheduleBlockType" AS ENUM ('UNAVAILABLE', 'PRIORITY');

ALTER TABLE "ScheduleBlock"
ADD COLUMN "type" "ScheduleBlockType" NOT NULL DEFAULT 'UNAVAILABLE',
ADD COLUMN "releaseAt" TIMESTAMP(3);

CREATE INDEX "ScheduleBlock_staffId_type_releaseAt_idx"
ON "ScheduleBlock"("staffId", "type", "releaseAt");

ALTER TABLE "ScheduleBlock"
ADD CONSTRAINT "ScheduleBlock_priority_release_check"
CHECK (
  ("type" = 'UNAVAILABLE' AND "releaseAt" IS NULL)
  OR (
    "type" = 'PRIORITY'
    AND ("releaseAt" IS NULL OR "releaseAt" < "startTime")
  )
);
