CREATE TYPE "DepositReceiptStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Appointment"
  ADD COLUMN "depositReceiptStatus" "DepositReceiptStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "depositReceiptPublicId" TEXT,
  ADD COLUMN "depositReceiptResourceType" TEXT,
  ADD COLUMN "depositReceiptFormat" TEXT,
  ADD COLUMN "depositReceiptOriginalName" TEXT,
  ADD COLUMN "depositReceiptUploadedAt" TIMESTAMP(3),
  ADD COLUMN "depositReceiptReviewedAt" TIMESTAMP(3),
  ADD COLUMN "depositReceiptReviewedById" TEXT,
  ADD COLUMN "depositReceiptTokenHash" TEXT;
