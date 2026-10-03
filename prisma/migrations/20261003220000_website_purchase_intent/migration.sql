-- Operational intent and BASE checkout claim, independent of Website billing/eligibility.
CREATE TABLE "WebsitePurchaseIntent" (
  "businessId" TEXT NOT NULL,
  "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "baseOperationKey" TEXT,
  "baseState" TEXT NOT NULL DEFAULT 'NONE',
  "baseCheckoutUrl" TEXT,
  "baseProviderId" TEXT,
  "baseActivatedAt" TIMESTAMP(3),
  CONSTRAINT "WebsitePurchaseIntent_pkey" PRIMARY KEY ("businessId"),
  CONSTRAINT "WebsitePurchaseIntent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WebsitePurchaseIntent_baseState_check" CHECK ("baseState" IN ('NONE','CREATING','PENDING','UNKNOWN','ACTIVE','CANCELLED'))
);
CREATE UNIQUE INDEX "WebsitePurchaseIntent_baseOperationKey_key" ON "WebsitePurchaseIntent"("baseOperationKey");
ALTER TABLE "WebsitePurchaseIntent" ENABLE ROW LEVEL SECURITY;
