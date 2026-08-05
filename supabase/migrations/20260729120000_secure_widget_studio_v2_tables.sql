-- Widget Studio V2 is accessed only through authenticated server-side services.
-- Keep its drafts, versions, assets and audit events outside the public Data API.
ALTER TABLE IF EXISTS public."WidgetDesign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WidgetDesignVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WidgetAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WidgetAssetReference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."WidgetDesignEvent" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public."WidgetDesign",
  public."WidgetDesignVersion",
  public."WidgetAsset",
  public."WidgetAssetReference",
  public."WidgetDesignEvent"
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      public."WidgetDesign",
      public."WidgetDesignVersion",
      public."WidgetAsset",
      public."WidgetAssetReference",
      public."WidgetDesignEvent"
    FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      public."WidgetDesign",
      public."WidgetDesignVersion",
      public."WidgetAsset",
      public."WidgetAssetReference",
      public."WidgetDesignEvent"
    FROM authenticated;
  END IF;
END
$$;
