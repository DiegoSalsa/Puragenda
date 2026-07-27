-- Widget Studio V2 is intentionally additive.
-- Existing Business fields, WidgetTheme and WidgetPromoBlock remain untouched.

CREATE TYPE "WidgetAssetStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED', 'ARCHIVED');
CREATE TYPE "WidgetAssetUsage" AS ENUM ('IMAGE', 'BACKGROUND', 'BANNER', 'POSTER');
CREATE TYPE "WidgetDesignEventType" AS ENUM (
  'DRAFT_CREATED',
  'DRAFT_SAVED',
  'DESIGN_PUBLISHED',
  'VERSION_RESTORED',
  'VERSION_ROLLED_BACK',
  'ASSET_UPLOADED',
  'ASSET_ARCHIVED',
  'PUBLISH_FAILED',
  'MIGRATION_STARTED',
  'MIGRATION_CANCELLED',
  'RENDER_FALLBACK'
);

CREATE TABLE "WidgetDesign" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "draftDocument" JSONB NOT NULL,
  "draftSchemaVersion" INTEGER NOT NULL DEFAULT 1,
  "draftRevision" INTEGER NOT NULL DEFAULT 1,
  "publishedVersionId" TEXT,
  "fallbackVersionId" TEXT,
  "rendererEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WidgetDesign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WidgetDesignVersion" (
  "id" TEXT NOT NULL,
  "designId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "document" JSONB NOT NULL,
  "checksum" TEXT NOT NULL,
  "publishedByUserId" TEXT NOT NULL,
  "changeSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WidgetDesignVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WidgetAsset" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "altDefault" TEXT,
  "blurDataUrl" TEXT,
  "status" "WidgetAssetStatus" NOT NULL DEFAULT 'PROCESSING',
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "WidgetAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WidgetAssetReference" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "designId" TEXT,
  "versionId" TEXT,
  "blockId" TEXT NOT NULL,
  "usage" "WidgetAssetUsage" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WidgetAssetReference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WidgetAssetReference_exactly_one_owner_check"
    CHECK (("designId" IS NOT NULL AND "versionId" IS NULL) OR ("designId" IS NULL AND "versionId" IS NOT NULL))
);

CREATE TABLE "WidgetDesignEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "designId" TEXT,
  "actorUserId" TEXT,
  "type" "WidgetDesignEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WidgetDesignEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WidgetDesign_businessId_key" ON "WidgetDesign"("businessId");
CREATE UNIQUE INDEX "WidgetDesign_publishedVersionId_key" ON "WidgetDesign"("publishedVersionId");
CREATE UNIQUE INDEX "WidgetDesign_fallbackVersionId_key" ON "WidgetDesign"("fallbackVersionId");
CREATE INDEX "WidgetDesign_publishedVersionId_idx" ON "WidgetDesign"("publishedVersionId");
CREATE INDEX "WidgetDesign_fallbackVersionId_idx" ON "WidgetDesign"("fallbackVersionId");

CREATE UNIQUE INDEX "WidgetDesignVersion_designId_versionNumber_key" ON "WidgetDesignVersion"("designId", "versionNumber");
CREATE INDEX "WidgetDesignVersion_designId_createdAt_idx" ON "WidgetDesignVersion"("designId", "createdAt");
CREATE INDEX "WidgetDesignVersion_checksum_idx" ON "WidgetDesignVersion"("checksum");

CREATE UNIQUE INDEX "WidgetAsset_provider_publicId_key" ON "WidgetAsset"("provider", "publicId");
CREATE INDEX "WidgetAsset_businessId_status_createdAt_idx" ON "WidgetAsset"("businessId", "status", "createdAt");
CREATE INDEX "WidgetAsset_createdByUserId_idx" ON "WidgetAsset"("createdByUserId");

CREATE UNIQUE INDEX "WidgetAssetReference_assetId_designId_blockId_usage_key"
  ON "WidgetAssetReference"("assetId", "designId", "blockId", "usage");
CREATE UNIQUE INDEX "WidgetAssetReference_assetId_versionId_blockId_usage_key"
  ON "WidgetAssetReference"("assetId", "versionId", "blockId", "usage");
CREATE INDEX "WidgetAssetReference_designId_idx" ON "WidgetAssetReference"("designId");
CREATE INDEX "WidgetAssetReference_versionId_idx" ON "WidgetAssetReference"("versionId");
CREATE INDEX "WidgetAssetReference_assetId_idx" ON "WidgetAssetReference"("assetId");

CREATE INDEX "WidgetDesignEvent_businessId_createdAt_idx" ON "WidgetDesignEvent"("businessId", "createdAt");
CREATE INDEX "WidgetDesignEvent_designId_createdAt_idx" ON "WidgetDesignEvent"("designId", "createdAt");
CREATE INDEX "WidgetDesignEvent_actorUserId_idx" ON "WidgetDesignEvent"("actorUserId");

ALTER TABLE "WidgetDesign"
  ADD CONSTRAINT "WidgetDesign_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WidgetDesignVersion"
  ADD CONSTRAINT "WidgetDesignVersion_designId_fkey"
  FOREIGN KEY ("designId") REFERENCES "WidgetDesign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WidgetDesignVersion"
  ADD CONSTRAINT "WidgetDesignVersion_publishedByUserId_fkey"
  FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WidgetDesign"
  ADD CONSTRAINT "WidgetDesign_publishedVersionId_fkey"
  FOREIGN KEY ("publishedVersionId") REFERENCES "WidgetDesignVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WidgetDesign"
  ADD CONSTRAINT "WidgetDesign_fallbackVersionId_fkey"
  FOREIGN KEY ("fallbackVersionId") REFERENCES "WidgetDesignVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WidgetAsset"
  ADD CONSTRAINT "WidgetAsset_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WidgetAsset"
  ADD CONSTRAINT "WidgetAsset_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WidgetAssetReference"
  ADD CONSTRAINT "WidgetAssetReference_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "WidgetAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WidgetAssetReference"
  ADD CONSTRAINT "WidgetAssetReference_designId_fkey"
  FOREIGN KEY ("designId") REFERENCES "WidgetDesign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WidgetAssetReference"
  ADD CONSTRAINT "WidgetAssetReference_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "WidgetDesignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WidgetDesignEvent"
  ADD CONSTRAINT "WidgetDesignEvent_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WidgetDesignEvent"
  ADD CONSTRAINT "WidgetDesignEvent_designId_fkey"
  FOREIGN KEY ("designId") REFERENCES "WidgetDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WidgetDesignEvent"
  ADD CONSTRAINT "WidgetDesignEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
