-- Platform discount codes created from the SuperAdmin panel.
CREATE TABLE "PlatformDiscountCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "discountType" TEXT NOT NULL,
  "discountValue" INTEGER NOT NULL,
  "maxRedemptions" INTEGER,
  "redeemedCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "appliesToPlans" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformDiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformDiscountRedemption" (
  "id" TEXT NOT NULL,
  "discountCodeId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "originalAmount" INTEGER NOT NULL,
  "discountedAmount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" TIMESTAMP(3),

  CONSTRAINT "PlatformDiscountRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformDiscountCode_code_key" ON "PlatformDiscountCode"("code");
CREATE INDEX "PlatformDiscountCode_isActive_idx" ON "PlatformDiscountCode"("isActive");
CREATE INDEX "PlatformDiscountCode_expiresAt_idx" ON "PlatformDiscountCode"("expiresAt");

CREATE UNIQUE INDEX "PlatformDiscountRedemption_discountCodeId_businessId_key" ON "PlatformDiscountRedemption"("discountCodeId", "businessId");
CREATE INDEX "PlatformDiscountRedemption_businessId_idx" ON "PlatformDiscountRedemption"("businessId");
CREATE INDEX "PlatformDiscountRedemption_subscriptionId_idx" ON "PlatformDiscountRedemption"("subscriptionId");
CREATE INDEX "PlatformDiscountRedemption_status_idx" ON "PlatformDiscountRedemption"("status");

ALTER TABLE "PlatformDiscountCode"
  ADD CONSTRAINT "PlatformDiscountCode_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformDiscountRedemption"
  ADD CONSTRAINT "PlatformDiscountRedemption_discountCodeId_fkey"
  FOREIGN KEY ("discountCodeId") REFERENCES "PlatformDiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformDiscountRedemption"
  ADD CONSTRAINT "PlatformDiscountRedemption_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlatformDiscountRedemption"
  ADD CONSTRAINT "PlatformDiscountRedemption_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
