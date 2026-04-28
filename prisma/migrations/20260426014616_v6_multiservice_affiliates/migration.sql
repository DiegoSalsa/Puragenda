-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "additionalServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totalDuration" INTEGER,
ADD COLUMN     "totalPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "maxServicesPerBooking" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "referredByAffiliateId" TEXT,
ADD COLUMN     "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN     "textMutedColor" TEXT NOT NULL DEFAULT '#FFFFFF66',
ADD COLUMN     "widgetFontSize" INTEGER NOT NULL DEFAULT 14;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "nextBillingDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "paidReferrals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_referralCode_key" ON "Affiliate"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_businessId_key" ON "Affiliate"("businessId");

-- CreateIndex
CREATE INDEX "Affiliate_referralCode_idx" ON "Affiliate"("referralCode");

-- CreateIndex
CREATE INDEX "Business_referredByAffiliateId_idx" ON "Business"("referredByAffiliateId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_referredByAffiliateId_fkey" FOREIGN KEY ("referredByAffiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
