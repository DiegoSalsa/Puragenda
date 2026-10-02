// Read-only production preflight. It never migrates, writes, creates a snapshot,
// prints connection strings, or returns secret values.
import fs from "node:fs";
import dotenv from "dotenv";
import pg from "pg";

if (process.env.PRODUCTION_PREFLIGHT_CONFIRM !== "READ_ONLY_ONLY") {
  throw new Error("Set PRODUCTION_PREFLIGHT_CONFIRM=READ_ONLY_ONLY to run this read-only check");
}

const env = { ...dotenv.parse(fs.readFileSync(".env")), ...process.env };
const required = ["DATABASE_URL", "DIRECT_URL"];
const report = {
  checkedAt: new Date().toISOString(),
  mode: "READ_ONLY",
  envPresence: Object.fromEntries(required.map((name) => [name, Boolean(env[name]?.trim())])),
  migration: {},
  schema: {},
  locks: {},
};

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
});

try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  report.database = {
    readOnly: (await client.query("SHOW transaction_read_only")).rows[0]?.transaction_read_only === "on",
    serverVersion: (await client.query("SHOW server_version")).rows[0]?.server_version,
  };

  const expected = [
    "20261001120000_website_launch_offers",
    "20261002190000_website_mercadopago",
  ];
  const migrationRows = (await client.query(
    `SELECT migration_name, finished_at IS NOT NULL AS finished,
            rolled_back_at IS NOT NULL AS rolled_back
       FROM "_prisma_migrations"
      WHERE migration_name = ANY($1::text[])
      ORDER BY migration_name`,
    [expected],
  )).rows;
  report.migration.expected = expected;
  report.migration.rows = migrationRows;
  report.migration.pending = expected.filter((name) => !migrationRows.some((row) => row.migration_name === name && row.finished && !row.rolled_back));
  report.migration.status = report.migration.pending.length === expected.length ? "EXACTLY_TWO_PENDING" : "REVIEW_REQUIRED";

  const tables = ["WebsiteLaunchSnapshot", "WebsiteOfferEligibility", "WebsiteCommercialEvent", "WebsiteCheckoutOperation"];
  report.schema.tables = (await client.query(
    `SELECT c.relname AS name, c.relrowsecurity AS rls
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])
      ORDER BY c.relname`,
    [tables],
  )).rows;
  report.schema.websiteAddonMpColumns = (await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='WebsiteAddon'
        AND column_name IN ('mpSubscriptionId','mpCustomerId') ORDER BY column_name`,
  )).rows.map((row) => row.column_name);

  const pid = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
  report.locks = {
    waiting: (await client.query(
      `SELECT count(*)::int AS count FROM pg_locks WHERE NOT granted AND pid <> $1`,
      [pid],
    )).rows[0].count,
    strongGranted: (await client.query(
      `SELECT count(*)::int AS count FROM pg_locks
        WHERE granted AND pid <> $1
          AND mode IN ('AccessExclusiveLock','ShareRowExclusiveLock')`,
      [pid],
    )).rows[0].count,
  };
  await client.query("ROLLBACK");
} catch (error) {
  report.errorCode = error?.code ?? "CONNECTION_OR_QUERY_FAILED";
  try { await client.query("ROLLBACK"); } catch {}
} finally {
  await client.end().catch(() => {});
}

const output = process.argv[2] || "scratch/website-production-preflight.json";
fs.mkdirSync(output.substring(0, output.lastIndexOf("/") || 1), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({
  mode: report.mode,
  readOnly: report.database?.readOnly ?? false,
  migrationStatus: report.migration.status,
  pending: report.migration.pending ?? [],
  waitingLocks: report.locks.waiting ?? null,
  strongGrantedLocks: report.locks.strongGranted ?? null,
  errorCode: report.errorCode ?? null,
}));
