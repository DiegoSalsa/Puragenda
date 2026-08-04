ALTER TABLE "Business"
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CL',
ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'CLP';

ALTER TABLE "Business"
ADD CONSTRAINT "Business_countryCode_check" CHECK ("countryCode" ~ '^[A-Z]{2}$'),
ADD CONSTRAINT "Business_currencyCode_check" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
