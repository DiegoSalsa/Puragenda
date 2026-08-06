ALTER TABLE "Business"
ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'es';

ALTER TABLE "Business"
ADD CONSTRAINT "Business_locale_check"
CHECK ("locale" IN ('es', 'en', 'it', 'pt', 'fr', 'de', 'zh-CN'));
