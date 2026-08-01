-- Google Calendar credentials and event mappings are server-only data.
-- Keep them inaccessible through Supabase's public Data API.
ALTER TABLE "GoogleCalendarConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GoogleCalendarEvent" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON TABLE "GoogleCalendarConnection" FROM anon;
    REVOKE ALL PRIVILEGES ON TABLE "GoogleCalendarEvent" FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "GoogleCalendarConnection" FROM authenticated;
    REVOKE ALL PRIVILEGES ON TABLE "GoogleCalendarEvent" FROM authenticated;
  END IF;
END
$$;
