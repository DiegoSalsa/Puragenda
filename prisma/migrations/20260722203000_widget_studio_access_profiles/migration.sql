-- Widget Studio + reusable access profiles.
-- All new columns are nullable or have defaults. Existing clients keep their
-- current UserRole behavior until an owner explicitly assigns a profile.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WidgetPromoPlacement') THEN
    CREATE TYPE "WidgetPromoPlacement" AS ENUM ('HEADER', 'BETWEEN_SERVICES', 'FOOTER');
  END IF;
END $$;

ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "widgetCornerRadius" INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS "widgetShadowStyle" TEXT NOT NULL DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS "widgetHeaderAlign" TEXT NOT NULL DEFAULT 'left';

ALTER TABLE "BusinessHours"
  ADD COLUMN IF NOT EXISTS "breakStart" TEXT,
  ADD COLUMN IF NOT EXISTS "breakEnd" TEXT;

ALTER TABLE "StaffSchedule"
  ADD COLUMN IF NOT EXISTS "breakStart" TEXT,
  ADD COLUMN IF NOT EXISTS "breakEnd" TEXT;

CREATE TABLE IF NOT EXISTS "WidgetTheme" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Personalizado',
  "primaryColor" TEXT NOT NULL,
  "secondaryColor" TEXT NOT NULL,
  "backgroundColor" TEXT NOT NULL,
  "textColor" TEXT NOT NULL,
  "textMutedColor" TEXT NOT NULL,
  "fontSize" INTEGER NOT NULL DEFAULT 14,
  "cornerRadius" INTEGER NOT NULL DEFAULT 16,
  "shadowStyle" TEXT NOT NULL DEFAULT 'soft',
  "headerAlign" TEXT NOT NULL DEFAULT 'left',
  "logoUrl" TEXT,
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WidgetTheme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WidgetPromoBlock" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "placement" "WidgetPromoPlacement" NOT NULL DEFAULT 'HEADER',
  "position" INTEGER NOT NULL DEFAULT 0,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "textAlign" TEXT NOT NULL DEFAULT 'left',
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WidgetPromoBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AccessProfile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "baseRole" "UserRole",
  "businessId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "accessProfileId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "WidgetTheme_businessId_name_key"
  ON "WidgetTheme" ("businessId", "name");
CREATE INDEX IF NOT EXISTS "WidgetTheme_businessId_category_idx"
  ON "WidgetTheme" ("businessId", "category");
CREATE INDEX IF NOT EXISTS "WidgetPromoBlock_businessId_placement_position_idx"
  ON "WidgetPromoBlock" ("businessId", "placement", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "AccessProfile_businessId_name_key"
  ON "AccessProfile" ("businessId", "name");
CREATE INDEX IF NOT EXISTS "AccessProfile_businessId_isSystem_idx"
  ON "AccessProfile" ("businessId", "isSystem");
CREATE INDEX IF NOT EXISTS "Staff_accessProfileId_idx"
  ON "Staff" ("accessProfileId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WidgetTheme_businessId_fkey'
      AND conrelid = '"WidgetTheme"'::regclass
  ) THEN
    ALTER TABLE "WidgetTheme"
      ADD CONSTRAINT "WidgetTheme_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'WidgetPromoBlock_businessId_fkey'
      AND conrelid = '"WidgetPromoBlock"'::regclass
  ) THEN
    ALTER TABLE "WidgetPromoBlock"
      ADD CONSTRAINT "WidgetPromoBlock_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AccessProfile_businessId_fkey'
      AND conrelid = '"AccessProfile"'::regclass
  ) THEN
    ALTER TABLE "AccessProfile"
      ADD CONSTRAINT "AccessProfile_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Staff_accessProfileId_fkey'
      AND conrelid = '"Staff"'::regclass
  ) THEN
    ALTER TABLE "Staff"
      ADD CONSTRAINT "Staff_accessProfileId_fkey"
      FOREIGN KEY ("accessProfileId") REFERENCES "AccessProfile"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "WidgetTheme"
  DROP CONSTRAINT IF EXISTS "WidgetTheme_fontSize_check";
ALTER TABLE "WidgetTheme"
  ADD CONSTRAINT "WidgetTheme_fontSize_check" CHECK ("fontSize" BETWEEN 10 AND 24);

ALTER TABLE "WidgetTheme"
  DROP CONSTRAINT IF EXISTS "WidgetTheme_cornerRadius_check";
ALTER TABLE "WidgetTheme"
  ADD CONSTRAINT "WidgetTheme_cornerRadius_check" CHECK ("cornerRadius" BETWEEN 0 AND 40);

ALTER TABLE "WidgetPromoBlock"
  DROP CONSTRAINT IF EXISTS "WidgetPromoBlock_position_check";
ALTER TABLE "WidgetPromoBlock"
  ADD CONSTRAINT "WidgetPromoBlock_position_check" CHECK ("position" >= 0);
