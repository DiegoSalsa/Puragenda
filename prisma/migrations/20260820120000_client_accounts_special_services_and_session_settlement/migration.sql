-- Client accounts use the existing server-side portal session and keep one
-- verified, global profile per normalized email.
CREATE TYPE "ClientPortalTokenPurpose" AS ENUM ('MAGIC_ACCESS', 'VERIFY_ACCOUNT', 'RESET_PASSWORD');
CREATE TYPE "ServiceAvailabilityType" AS ENUM ('NORMAL', 'SPECIAL');

ALTER TABLE "ClientPortalToken"
ADD COLUMN "purpose" "ClientPortalTokenPurpose" NOT NULL DEFAULT 'MAGIC_ACCESS';

CREATE TABLE "ClientPortalAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "defaultAddress" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClientPortalAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientPortalAccount_email_key" ON "ClientPortalAccount"("email");
CREATE INDEX "ClientPortalAccount_emailVerifiedAt_idx" ON "ClientPortalAccount"("emailVerifiedAt");

ALTER TABLE "Service"
ADD COLUMN "availabilityType" "ServiceAvailabilityType" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "specialWeekDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "specialStartDate" DATE,
ADD COLUMN "specialEndDate" DATE,
ADD COLUMN "specialStartTime" TEXT,
ADD COLUMN "specialEndTime" TEXT;

ALTER TABLE "Appointment"
ADD COLUMN "sessionBaseAmount" DOUBLE PRECISION,
ADD COLUMN "tipAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "postSessionItems" JSONB,
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "settledAt" TIMESTAMP(3),
ADD COLUMN "settledByUserId" TEXT;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_settledByUserId_fkey"
FOREIGN KEY ("settledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Appointment_settledByUserId_idx" ON "Appointment"("settledByUserId");

-- These tables are accessed only through server-side Prisma. They remain
-- unavailable to anon/authenticated Data API roles unless explicit policies
-- are added later.
ALTER TABLE "ClientPortalAccount" ENABLE ROW LEVEL SECURITY;
