-- These tables are only accessed by the server-side Prisma connection.
-- Keep them unavailable through Supabase's public Data API.
ALTER TABLE IF EXISTS public."WidgetPromoBlock"
  ADD COLUMN IF NOT EXISTS "cloudinaryPublicId" TEXT;

ALTER TABLE IF EXISTS public."WidgetTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WidgetPromoBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."AccessProfile" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      public."WidgetTheme",
      public."WidgetPromoBlock",
      public."AccessProfile"
    FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      public."WidgetTheme",
      public."WidgetPromoBlock",
      public."AccessProfile"
    FROM authenticated;
  END IF;
END
$$;

-- Enforce the same closed sets accepted by the server actions.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Business_widgetShadowStyle_check'
      AND conrelid = 'public."Business"'::regclass
  ) THEN
    ALTER TABLE public."Business"
      ADD CONSTRAINT "Business_widgetShadowStyle_check"
      CHECK ("widgetShadowStyle" IN ('none', 'soft', 'strong')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Business_widgetHeaderAlign_check'
      AND conrelid = 'public."Business"'::regclass
  ) THEN
    ALTER TABLE public."Business"
      ADD CONSTRAINT "Business_widgetHeaderAlign_check"
      CHECK ("widgetHeaderAlign" IN ('left', 'center', 'right')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WidgetTheme_shadowStyle_check'
      AND conrelid = 'public."WidgetTheme"'::regclass
  ) THEN
    ALTER TABLE public."WidgetTheme"
      ADD CONSTRAINT "WidgetTheme_shadowStyle_check"
      CHECK ("shadowStyle" IN ('none', 'soft', 'strong')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WidgetTheme_headerAlign_check'
      AND conrelid = 'public."WidgetTheme"'::regclass
  ) THEN
    ALTER TABLE public."WidgetTheme"
      ADD CONSTRAINT "WidgetTheme_headerAlign_check"
      CHECK ("headerAlign" IN ('left', 'center', 'right')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'WidgetPromoBlock_textAlign_check'
      AND conrelid = 'public."WidgetPromoBlock"'::regclass
  ) THEN
    ALTER TABLE public."WidgetPromoBlock"
      ADD CONSTRAINT "WidgetPromoBlock_textAlign_check"
      CHECK ("textAlign" IN ('left', 'center', 'right')) NOT VALID;
  END IF;
END
$$;

ALTER TABLE public."Business"
  VALIDATE CONSTRAINT "Business_widgetShadowStyle_check";
ALTER TABLE public."Business"
  VALIDATE CONSTRAINT "Business_widgetHeaderAlign_check";
ALTER TABLE public."WidgetTheme"
  VALIDATE CONSTRAINT "WidgetTheme_shadowStyle_check";
ALTER TABLE public."WidgetTheme"
  VALIDATE CONSTRAINT "WidgetTheme_headerAlign_check";
ALTER TABLE public."WidgetPromoBlock"
  VALIDATE CONSTRAINT "WidgetPromoBlock_textAlign_check";
