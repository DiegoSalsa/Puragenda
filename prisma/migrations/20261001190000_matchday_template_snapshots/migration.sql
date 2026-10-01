ALTER TABLE "BusinessWebsite"
  ADD COLUMN "templateConfigs" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "publishedTemplateKey" TEXT,
  ADD COLUMN "publishedTemplateVersion" INTEGER;

UPDATE "BusinessWebsite"
SET "templateConfigs" = jsonb_build_object("templateKey" || '@' || "templateVersion"::text, "draftConfig"),
    "publishedTemplateKey" = CASE WHEN "publishedConfig" IS NOT NULL THEN "templateKey" END,
    "publishedTemplateVersion" = CASE WHEN "publishedConfig" IS NOT NULL THEN "templateVersion" END;
