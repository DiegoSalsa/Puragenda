ALTER TABLE "PuriUsageReservation" ADD COLUMN "cacheWriteTokens" INTEGER;
ALTER TABLE "PuriUsageReservation" ADD CONSTRAINT puri_cache_write_tokens_nonnegative CHECK ("cacheWriteTokens" IS NULL OR "cacheWriteTokens">=0);
