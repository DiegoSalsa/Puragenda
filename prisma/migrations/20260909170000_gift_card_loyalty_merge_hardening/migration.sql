-- Index newly introduced foreign keys so joins and parent-row updates do not
-- degrade into table scans as Gift Cards and loyalty usage grow.
CREATE INDEX "Business_loyaltyRewardServiceId_idx" ON "Business"("loyaltyRewardServiceId");
CREATE INDEX "GiftCardPurchase_templateId_idx" ON "GiftCardPurchase"("templateId");
CREATE INDEX "LoyaltyCode_freeServiceId_idx" ON "LoyaltyCode"("freeServiceId");
