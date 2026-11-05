CREATE INDEX "CommercialBillingOperation_recovery_idx"
ON "CommercialBillingOperation" ("provider", "environment", "updatedAt", "id");
