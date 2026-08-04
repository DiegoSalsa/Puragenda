ALTER TABLE "Subscription"
  ADD COLUMN "paddleCustomerId" TEXT,
  ADD COLUMN "paddleSubscriptionId" TEXT,
  ADD COLUMN "paddlePriceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "paddleLastEventAt" TIMESTAMP(3),
  ADD COLUMN "paddleLastEventId" TEXT;

CREATE UNIQUE INDEX "Subscription_paddleCustomerId_key" ON "Subscription"("paddleCustomerId");
CREATE UNIQUE INDEX "Subscription_paddleSubscriptionId_key" ON "Subscription"("paddleSubscriptionId");
