ALTER TABLE "WebsiteAddon" ADD COLUMN "mpSubscriptionId" TEXT, ADD COLUMN "mpCustomerId" TEXT;
CREATE UNIQUE INDEX "WebsiteAddon_mpSubscriptionId_key" ON "WebsiteAddon"("mpSubscriptionId");
CREATE TABLE "WebsiteCheckoutOperation" (
  "id" TEXT NOT NULL, "addonId" TEXT NOT NULL, "provider" TEXT NOT NULL DEFAULT 'mercadopago',
  "priceTier" "WebsitePriceTier" NOT NULL, "amount" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'CLP',
  "firstChargeAt" TIMESTAMP(3), "state" TEXT NOT NULL DEFAULT 'CREATING', "mpSubscriptionId" TEXT,
  "checkoutUrl" TEXT, "providerStatus" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteCheckoutOperation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteCheckoutOperation_addonId_fkey" FOREIGN KEY ("addonId") REFERENCES "WebsiteAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WebsiteCheckoutOperation_mpSubscriptionId_key" ON "WebsiteCheckoutOperation"("mpSubscriptionId");
CREATE INDEX "WebsiteCheckoutOperation_addonId_createdAt_idx" ON "WebsiteCheckoutOperation"("addonId", "createdAt");
ALTER TABLE "WebsiteCheckoutOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "WebsiteCheckoutOperation" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON TABLE "WebsiteCheckoutOperation" FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON TABLE "WebsiteCheckoutOperation" FROM authenticated; END IF;
END $$;
