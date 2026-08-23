-- Stable per-client credentials and Apple device registrations for loyalty
-- passes. These tables are only accessed through the server-side Prisma client.
CREATE TABLE "LoyaltyWalletPass" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "scanToken" TEXT NOT NULL,
    "appleAuthenticationToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyWalletPass_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppleWalletDevice" (
    "deviceLibraryIdentifier" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleWalletDevice_pkey" PRIMARY KEY ("deviceLibraryIdentifier")
);

CREATE TABLE "AppleWalletPassRegistration" (
    "id" TEXT NOT NULL,
    "loyaltyWalletPassId" TEXT NOT NULL,
    "deviceLibraryIdentifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppleWalletPassRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyWalletPass_clientId_key" ON "LoyaltyWalletPass"("clientId");
CREATE UNIQUE INDEX "LoyaltyWalletPass_serialNumber_key" ON "LoyaltyWalletPass"("serialNumber");
CREATE UNIQUE INDEX "LoyaltyWalletPass_scanToken_key" ON "LoyaltyWalletPass"("scanToken");
CREATE UNIQUE INDEX "LoyaltyWalletPass_appleAuthenticationToken_key" ON "LoyaltyWalletPass"("appleAuthenticationToken");
CREATE INDEX "LoyaltyWalletPass_updatedAt_idx" ON "LoyaltyWalletPass"("updatedAt");
CREATE UNIQUE INDEX "AppleWalletPassRegistration_loyaltyWalletPassId_deviceLibraryIdentifier_key"
  ON "AppleWalletPassRegistration"("loyaltyWalletPassId", "deviceLibraryIdentifier");
CREATE INDEX "AppleWalletPassRegistration_deviceLibraryIdentifier_idx"
  ON "AppleWalletPassRegistration"("deviceLibraryIdentifier");

ALTER TABLE "LoyaltyWalletPass"
  ADD CONSTRAINT "LoyaltyWalletPass_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppleWalletPassRegistration"
  ADD CONSTRAINT "AppleWalletPassRegistration_loyaltyWalletPassId_fkey"
  FOREIGN KEY ("loyaltyWalletPassId") REFERENCES "LoyaltyWalletPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppleWalletPassRegistration"
  ADD CONSTRAINT "AppleWalletPassRegistration_deviceLibraryIdentifier_fkey"
  FOREIGN KEY ("deviceLibraryIdentifier") REFERENCES "AppleWalletDevice"("deviceLibraryIdentifier") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoyaltyWalletPass" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppleWalletDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppleWalletPassRegistration" ENABLE ROW LEVEL SECURITY;
