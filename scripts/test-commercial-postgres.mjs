import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import pg from "pg";
const url = new URL(process.env.COMMERCIAL_V2_TEST_DATABASE_URL || "postgres://invalid/invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/puragenda_commercial_test" || process.env.NODE_ENV === "production") throw new Error("Dedicated disposable local database required");
// No dotenv or fallback to production URLs. This database is disposable in full.
const env = { ...process.env, DATABASE_URL: url.href, DIRECT_URL: url.href, COMMERCIAL_V2_INTERNAL_WRITES: "1" };
mkdirSync("scratch", { recursive: true });
writeFileSync("scratch/commercial-legacy.prisma", execFileSync("git", ["show", "e471373:prisma/schema.prisma"]));
const diff = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema", "scratch/commercial-legacy.prisma", "--script", "--output", "scratch/commercial-baseline.sql"], { env, stdio: "inherit" });
if (diff.status !== 0) process.exit(diff.status || 1);
const pool = new pg.Pool({ connectionString: url.href });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await client.query(readFileSync("scratch/commercial-baseline.sql", "utf8"));
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  END $$;`);
  // Recreate Supabase default grants so migration revocation is genuinely tested.
  await client.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated');
  await client.query(readFileSync("prisma/migrations/20261021120000_commercial_infrastructure_v2/migration.sql", "utf8"));
  await client.query("COMMIT");
  console.log("Legacy baseline + additive commercial migration applied on isolated PostgreSQL.");
} catch (error) { await client.query("ROLLBACK"); throw error; }
finally { client.release(); await pool.end(); }
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "tests/integration/commercial-v2-postgres.integration.test.ts", "--reporter=verbose"], { env, stdio: "inherit" });
process.exit(result.status ?? 1);
