-- CreateTable
CREATE TABLE "ServiceOptionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOptionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOptionAlternative" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationDelta" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOptionAlternative_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "selectedOptions" JSONB;

-- CreateIndex
CREATE INDEX "ServiceOptionCategory_serviceId_idx" ON "ServiceOptionCategory"("serviceId");
CREATE INDEX "ServiceOptionCategory_serviceId_position_idx" ON "ServiceOptionCategory"("serviceId", "position");
CREATE INDEX "ServiceOptionAlternative_categoryId_idx" ON "ServiceOptionAlternative"("categoryId");
CREATE INDEX "ServiceOptionAlternative_categoryId_position_idx" ON "ServiceOptionAlternative"("categoryId", "position");

-- AddForeignKey
ALTER TABLE "ServiceOptionCategory"
ADD CONSTRAINT "ServiceOptionCategory_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceOptionAlternative"
ADD CONSTRAINT "ServiceOptionAlternative_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "ServiceOptionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
