-- CreateTable: BusinessScheduleOverride
CREATE TABLE IF NOT EXISTS "BusinessScheduleOverride" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StaffScheduleOverride
CREATE TABLE IF NOT EXISTS "StaffScheduleOverride" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "staffId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BusinessScheduleOverride_businessId_date_key" ON "BusinessScheduleOverride"("businessId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BusinessScheduleOverride_businessId_date_idx" ON "BusinessScheduleOverride"("businessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StaffScheduleOverride_staffId_date_key" ON "StaffScheduleOverride"("staffId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffScheduleOverride_staffId_date_idx" ON "StaffScheduleOverride"("staffId", "date");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BusinessScheduleOverride_businessId_fkey'
  ) THEN
    ALTER TABLE "BusinessScheduleOverride" ADD CONSTRAINT "BusinessScheduleOverride_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StaffScheduleOverride_staffId_fkey'
  ) THEN
    ALTER TABLE "StaffScheduleOverride" ADD CONSTRAINT "StaffScheduleOverride_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
