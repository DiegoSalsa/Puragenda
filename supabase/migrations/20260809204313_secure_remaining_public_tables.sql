-- These tables live in Supabase's exposed public schema. Prisma is the only
-- supported application data path, so browser roles must not access them.
ALTER TABLE public."BusinessScheduleOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformDiscountCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformDiscountRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ServiceOptionAlternative" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ServiceOptionCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StaffScheduleOverride" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public."BusinessScheduleOverride",
  public."PlatformDiscountCode",
  public."PlatformDiscountRedemption",
  public."ServiceOptionAlternative",
  public."ServiceOptionCategory",
  public."StaffScheduleOverride"
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE
      public."BusinessScheduleOverride",
      public."PlatformDiscountCode",
      public."PlatformDiscountRedemption",
      public."ServiceOptionAlternative",
      public."ServiceOptionCategory",
      public."StaffScheduleOverride"
    FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      public."BusinessScheduleOverride",
      public."PlatformDiscountCode",
      public."PlatformDiscountRedemption",
      public."ServiceOptionAlternative",
      public."ServiceOptionCategory",
      public."StaffScheduleOverride"
    FROM authenticated;
  END IF;
END
$$;
