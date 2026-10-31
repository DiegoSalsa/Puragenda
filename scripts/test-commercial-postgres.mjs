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
  DIRECT_URL: source.href, COMMERCIAL_V2_INTERNAL_WRITES: "1", COMMERCIAL_V2_MIGRATION_WRITES: "1", COMMERCIAL_V2_MIGRATION_FIXTURES: "1", PURI_PLUS_INTERNAL_ENABLED: "1", CONTACT_FLOW_LAB_ENABLED:"1", CONTACT_FLOW_TOKEN_SECRET:randomUUID()+randomUUID() };
console.log(`Isolated commercial PostgreSQL database: ${name}`);
const postgresFiles=["tests/integration/commercial-v2-postgres.integration.test.ts","tests/integration/commercial-billing-postgres.integration.test.ts","tests/integration/commercial-migration-postgres.integration.test.ts","tests/integration/puri-growth-postgres.integration.test.ts","tests/integration/contact-flow-postgres.integration.test.ts"];
const run=(args)=>spawnSync(process.execPath,["node_modules/vitest/vitest.mjs","run",...args,"--reporter=dot",...(process.argv.includes("--audit05-report")?["--reporter=json","--outputFile.json=scratch/audit05/commercial.json"]:[])],{env,stdio:"inherit",windowsHide:true}).status??1;
// Files share platform budget/policy rows. Serialize suites so one fixture's
// temporary global limit cannot affect another suite. Worker races inside each
// test still execute concurrently against real PostgreSQL.
postgresFiles.push("tests/integration/commercial-launch-postgres.integration.test.ts");
postgresFiles.push("tests/integration/commercial-mp-owner-postgres.integration.test.ts");
postgresFiles.push("tests/integration/registration-v2-postgres.integration.test.ts");
postgresFiles.push("tests/integration/mercadopago-v2-postgres.integration.test.ts");
postgresFiles.push("tests/integration/contact-flow-free-postgres.integration.test.ts");
postgresFiles.push("tests/integration/services-staff-postgres.integration.test.ts");
postgresFiles.push("tests/integration/clients-privacy-postgres.integration.test.ts");
postgresFiles.push("tests/integration/audit05-billing-postgres.integration.test.ts","tests/integration/audit05-legacy-postgres.integration.test.ts","tests/integration/audit05-rate-limit-postgres.integration.test.ts");
postgresFiles.push("tests/integration/audit05-expansions-postgres.integration.test.ts", "tests/integration/audit05-grace-postgres.integration.test.ts");
const postgresStatus=run([...(process.argv.includes("--audit05")?postgresFiles.filter(file=>file.includes("audit05-")):process.argv.includes("--clients-privacy")?[postgresFiles[11]]:process.argv.includes("--services-staff")?[postgresFiles[10]]:process.argv.includes("--contact-flow-free")?[postgresFiles[9]]:process.argv.includes("--contact-flow")?[postgresFiles[4]]:process.argv.includes("--launch")?[postgresFiles[5]]:postgresFiles),"--no-file-parallelism"]);
if(postgresStatus!==0)process.exit(postgresStatus);
if(process.argv.includes("--all"))process.exit(run(postgresFiles.flatMap(file=>["--exclude",file])));
process.exit(0);
