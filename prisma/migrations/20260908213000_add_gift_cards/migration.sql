CREATE TYPE "GiftCardType" AS ENUM ('BALANCE', 'SERVICE');
CREATE TYPE "GiftCardPaymentMethod" AS ENUM ('MERCADOPAGO', 'MANUAL');
CREATE TYPE "GiftCardPurchaseStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'MANUAL_PAID');
CREATE TYPE "GiftCardDeliveryMode" AS ENUM ('SELF', 'GIFT');
CREATE TYPE "GiftCardStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'VOIDED', 'REFUNDED', 'EXPIRED');
CREATE TYPE "GiftCardTransactionType" AS ENUM ('ISSUED', 'REDEEMED', 'RELEASED', 'ADJUSTMENT', 'VOID', 'REFUND');
CREATE TYPE "GiftCardRedemptionStatus" AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED');

ALTER TABLE "Appointment" ADD COLUMN "giftCardPaidAmount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "GiftCardTemplate" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" "GiftCardType" NOT NULL,
  "salePrice" INTEGER NOT NULL,
  "faceValue" INTEGER,
  "currencyCode" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "designPreset" TEXT NOT NULL DEFAULT 'classic',
  "backgroundColor" TEXT NOT NULL DEFAULT '#FFF5BA',
  "accentColor" TEXT NOT NULL DEFAULT '#FF8FAB',
  "textColor" TEXT NOT NULL DEFAULT '#111111',
  "imageUrl" TEXT,
  "shortMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCardTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardTemplate_salePrice_check" CHECK ("salePrice" > 0),
  CONSTRAINT "GiftCardTemplate_faceValue_check" CHECK (("type" = 'BALANCE' AND "faceValue" > 0) OR ("type" = 'SERVICE' AND "faceValue" IS NULL))
);

CREATE TABLE "GiftCardTemplateService" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "GiftCardTemplateService_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardTemplateService_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "GiftCardPurchase" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "templateId" TEXT,
  "type" "GiftCardType" NOT NULL,
  "paymentMethod" "GiftCardPaymentMethod" NOT NULL,
  "paymentStatus" "GiftCardPurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "salePrice" INTEGER NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "templateNameSnapshot" TEXT NOT NULL,
  "templateSnapshot" JSONB NOT NULL,
  "buyerName" TEXT NOT NULL,
  "buyerEmail" TEXT NOT NULL,
  "deliveryMode" "GiftCardDeliveryMode" NOT NULL,
  "recipientName" TEXT,
  "recipientEmail" TEXT,
  "senderName" TEXT,
  "giftMessage" TEXT,
  "mpPreferenceId" TEXT,
  "mpPaymentId" TEXT,
  "mpStatus" TEXT,
  "manualPaymentMethod" TEXT,
  "createdById" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCardPurchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardPurchase_salePrice_check" CHECK ("salePrice" > 0),
  CONSTRAINT "GiftCardPurchase_gift_delivery_check" CHECK (
    ("deliveryMode" = 'SELF') OR
    ("deliveryMode" = 'GIFT' AND "recipientName" IS NOT NULL AND "recipientEmail" IS NOT NULL AND "senderName" IS NOT NULL)
  )
);

CREATE TABLE "GiftCard" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "templateId" TEXT,
  "publicCode" TEXT NOT NULL,
  "claimTokenHash" TEXT NOT NULL,
  "type" "GiftCardType" NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "descriptionSnapshot" TEXT,
  "currencyCode" TEXT NOT NULL,
  "salePriceSnapshot" INTEGER NOT NULL,
  "faceValueSnapshot" INTEGER,
  "designPresetSnapshot" TEXT NOT NULL,
  "backgroundColorSnapshot" TEXT NOT NULL,
  "accentColorSnapshot" TEXT NOT NULL,
  "textColorSnapshot" TEXT NOT NULL,
  "imageUrlSnapshot" TEXT,
  "shortMessageSnapshot" TEXT,
  "initialBalance" INTEGER,
  "remainingBalance" INTEGER,
  "claimedByAccountId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "status" "GiftCardStatus" NOT NULL DEFAULT 'ACTIVE',
  "voidReason" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCard_balance_check" CHECK (
    ("type" = 'BALANCE' AND "initialBalance" >= 0 AND "remainingBalance" >= 0 AND "remainingBalance" <= "initialBalance") OR
    ("type" = 'SERVICE' AND "initialBalance" IS NULL AND "remainingBalance" IS NULL)
  )
);

CREATE TABLE "GiftCardServiceEntitlement" (
  "id" TEXT NOT NULL,
  "giftCardId" TEXT NOT NULL,
  "serviceId" TEXT,
  "serviceNameSnapshot" TEXT NOT NULL,
  "quantityInitial" INTEGER NOT NULL,
  "quantityRemaining" INTEGER NOT NULL,
  CONSTRAINT "GiftCardServiceEntitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardServiceEntitlement_quantity_check" CHECK ("quantityInitial" > 0 AND "quantityRemaining" >= 0 AND "quantityRemaining" <= "quantityInitial")
);

CREATE TABLE "GiftCardRedemption" (
  "id" TEXT NOT NULL,
  "giftCardId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "amountCovered" INTEGER NOT NULL DEFAULT 0,
  "status" "GiftCardRedemptionStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "committedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardRedemption_amount_check" CHECK ("amountCovered" >= 0)
);

CREATE TABLE "GiftCardRedemptionItem" (
  "id" TEXT NOT NULL,
  "redemptionId" TEXT NOT NULL,
  "entitlementId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "amountCovered" INTEGER NOT NULL DEFAULT 0,
  "serviceNameSnapshot" TEXT NOT NULL,
  CONSTRAINT "GiftCardRedemptionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GiftCardRedemptionItem_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "GiftCardRedemptionItem_amount_check" CHECK ("amountCovered" >= 0)
);

CREATE TABLE "GiftCardTransaction" (
  "id" TEXT NOT NULL,
  "giftCardId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" "GiftCardTransactionType" NOT NULL,
  "appointmentId" TEXT,
  "redemptionId" TEXT,
  "reason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GiftCardTemplate_businessId_isActive_isPublic_position_idx" ON "GiftCardTemplate"("businessId", "isActive", "isPublic", "position");
CREATE UNIQUE INDEX "GiftCardTemplateService_templateId_serviceId_key" ON "GiftCardTemplateService"("templateId", "serviceId");
CREATE INDEX "GiftCardTemplateService_serviceId_idx" ON "GiftCardTemplateService"("serviceId");
CREATE UNIQUE INDEX "GiftCardPurchase_mpPaymentId_key" ON "GiftCardPurchase"("mpPaymentId");
CREATE INDEX "GiftCardPurchase_businessId_paymentStatus_createdAt_idx" ON "GiftCardPurchase"("businessId", "paymentStatus", "createdAt");
CREATE INDEX "GiftCardPurchase_mpPreferenceId_idx" ON "GiftCardPurchase"("mpPreferenceId");
CREATE INDEX "GiftCardPurchase_createdById_idx" ON "GiftCardPurchase"("createdById");
CREATE UNIQUE INDEX "GiftCard_purchaseId_key" ON "GiftCard"("purchaseId");
CREATE UNIQUE INDEX "GiftCard_publicCode_key" ON "GiftCard"("publicCode");
CREATE UNIQUE INDEX "GiftCard_claimTokenHash_key" ON "GiftCard"("claimTokenHash");
CREATE INDEX "GiftCard_businessId_status_idx" ON "GiftCard"("businessId", "status");
CREATE INDEX "GiftCard_claimedByAccountId_status_idx" ON "GiftCard"("claimedByAccountId", "status");
CREATE INDEX "GiftCard_templateId_idx" ON "GiftCard"("templateId");
CREATE UNIQUE INDEX "GiftCardServiceEntitlement_giftCardId_serviceId_key" ON "GiftCardServiceEntitlement"("giftCardId", "serviceId");
CREATE INDEX "GiftCardServiceEntitlement_giftCardId_idx" ON "GiftCardServiceEntitlement"("giftCardId");
CREATE INDEX "GiftCardServiceEntitlement_serviceId_idx" ON "GiftCardServiceEntitlement"("serviceId");
CREATE UNIQUE INDEX "GiftCardRedemption_appointmentId_key" ON "GiftCardRedemption"("appointmentId");
CREATE INDEX "GiftCardRedemption_giftCardId_status_idx" ON "GiftCardRedemption"("giftCardId", "status");
CREATE INDEX "GiftCardRedemption_status_createdAt_idx" ON "GiftCardRedemption"("status", "createdAt");
CREATE UNIQUE INDEX "GiftCardRedemptionItem_redemptionId_entitlementId_key" ON "GiftCardRedemptionItem"("redemptionId", "entitlementId");
CREATE INDEX "GiftCardRedemptionItem_entitlementId_idx" ON "GiftCardRedemptionItem"("entitlementId");
CREATE INDEX "GiftCardTransaction_giftCardId_createdAt_idx" ON "GiftCardTransaction"("giftCardId", "createdAt");
CREATE INDEX "GiftCardTransaction_appointmentId_idx" ON "GiftCardTransaction"("appointmentId");
CREATE INDEX "GiftCardTransaction_redemptionId_idx" ON "GiftCardTransaction"("redemptionId");
CREATE INDEX "GiftCardTransaction_createdById_idx" ON "GiftCardTransaction"("createdById");

ALTER TABLE "GiftCardTemplate" ADD CONSTRAINT "GiftCardTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardTemplateService" ADD CONSTRAINT "GiftCardTemplateService_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GiftCardTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardTemplateService" ADD CONSTRAINT "GiftCardTemplateService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GiftCardTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardPurchase" ADD CONSTRAINT "GiftCardPurchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "GiftCardPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GiftCardTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_claimedByAccountId_fkey" FOREIGN KEY ("claimedByAccountId") REFERENCES "ClientPortalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardServiceEntitlement" ADD CONSTRAINT "GiftCardServiceEntitlement_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardServiceEntitlement" ADD CONSTRAINT "GiftCardServiceEntitlement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCardRedemptionItem" ADD CONSTRAINT "GiftCardRedemptionItem_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "GiftCardRedemption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GiftCardRedemptionItem" ADD CONSTRAINT "GiftCardRedemptionItem_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "GiftCardServiceEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "GiftCardRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Gift Card data is server-only. The public schema is exposed by Supabase, so
-- browser roles receive no privileges and RLS remains enabled as defense in depth.
ALTER TABLE public."GiftCardTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GiftCardTemplateService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GiftCardPurchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GiftCard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GiftCardServiceEntitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GiftCardRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GiftCardRedemptionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."GiftCardTransaction" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."GiftCardTemplate", public."GiftCardTemplateService", public."GiftCardPurchase", public."GiftCard", public."GiftCardServiceEntitlement", public."GiftCardRedemption", public."GiftCardRedemptionItem", public."GiftCardTransaction" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."GiftCardTemplate", public."GiftCardTemplateService", public."GiftCardPurchase", public."GiftCard", public."GiftCardServiceEntitlement", public."GiftCardRedemption", public."GiftCardRedemptionItem", public."GiftCardTransaction" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."GiftCardTemplate", public."GiftCardTemplateService", public."GiftCardPurchase", public."GiftCard", public."GiftCardServiceEntitlement", public."GiftCardRedemption", public."GiftCardRedemptionItem", public."GiftCardTransaction" FROM authenticated;
  END IF;
END
$$;
