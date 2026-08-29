import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is required");

const client = new pg.Client({ connectionString });
await client.connect();
try {
  const result = await client.query(
    `SELECT c.relname, c.relrowsecurity,
       has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
       has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = ANY($1)
     ORDER BY c.relname`,
    [["TrackingEvent", "TrackingConsent", "PrivacyRequest", "PrivacyRestriction", "ApiRateLimitBucket"]],
  );
  console.table(result.rows);
  if (result.rows.length !== 5 || result.rows.some((row) => !row.relrowsecurity || row.anon_access || row.authenticated_access)) {
    throw new Error("Tracking/privacy tables are not fully isolated");
  }
} finally {
  await client.end();
}
