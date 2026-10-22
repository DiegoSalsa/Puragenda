import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { deployCommercialMigrations, localCommercialDatabase } from "./commercial-migrations.mjs";
const source = new URL(localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL));
const adminUrl = new URL(source); adminUrl.pathname = "/postgres";
const pool = new pg.Pool({ connectionString: adminUrl.href });
const name = `puragenda_commercial_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
try {
  await pool.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF; END $$;");
  await pool.query(`CREATE DATABASE "${name}"`); } finally { await pool.end(); }
source.pathname = `/${name}`;
await deployCommercialMigrations(source.href);
const env = { ...process.env, COMMERCIAL_V2_TEST_DATABASE_URL: source.href, DATABASE_URL: source.href,
  DIRECT_URL: source.href, COMMERCIAL_V2_INTERNAL_WRITES: "1", COMMERCIAL_V2_MIGRATION_WRITES: "1", COMMERCIAL_V2_MIGRATION_FIXTURES: "1", PURI_PLUS_INTERNAL_ENABLED: "1" };
console.log(`Isolated commercial PostgreSQL database: ${name}`);
const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", ...(process.argv.includes("--all") ? [] : ["tests/integration/commercial-v2-postgres.integration.test.ts", "tests/integration/commercial-billing-postgres.integration.test.ts", "tests/integration/commercial-migration-postgres.integration.test.ts", "tests/integration/puri-growth-postgres.integration.test.ts"]), "--reporter=dot"], { env, stdio: "inherit", windowsHide: true });
process.exit(result.status ?? 1);
