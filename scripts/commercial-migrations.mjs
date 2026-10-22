import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const baselineName = "00000000000000_legacy";
const manifest = JSON.parse(readFileSync(resolve(root, "prisma/bootstrap/manifest.json"), "utf8"));
export function localCommercialDatabase(raw) {
  const url = new URL(raw || "postgres://invalid/invalid");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/puragenda_commercial_(test|bootstrap_test|legacy_test)(?:_[a-z0-9]+)?$/.test(url.pathname) || process.env.NODE_ENV === "production") throw new Error("ISOLATED_COMMERCIAL_DATABASE_REQUIRED");
  return url.href;
}
export function prepareCommercialMigrationConfig(databaseUrl) {
  const url = localCommercialDatabase(databaseUrl);
  mkdirSync(resolve(root, "scratch"), { recursive: true });
  const path = mkdtempSync(resolve(root, "scratch/migration-run-"));
  mkdirSync(resolve(path, "migrations"));
  cpSync(resolve(root, "prisma/bootstrap", baselineName), resolve(path, "migrations", baselineName), { recursive: true });
  for (const name of readdirSync(resolve(root, "prisma/migrations"))) {
    if (name >= manifest.cutoverMigration && name !== "migration_lock.toml") cpSync(resolve(root, "prisma/migrations", name), resolve(path, "migrations", name), { recursive: true });
  }
  writeFileSync(resolve(path, "migrations/migration_lock.toml"), 'provider = "postgresql"\n');
  const config = resolve(path, "prisma.config.ts");
  writeFileSync(config, `import { defineConfig } from "prisma/config";\nexport default defineConfig({ schema: ${JSON.stringify(resolve(root, "prisma/schema.prisma"))}, migrations: { path: ${JSON.stringify(resolve(path, "migrations"))} }, datasource: { url: process.env.COMMERCIAL_V2_TEST_DATABASE_URL } });\n`);
  const run = args => {
    const result = spawnSync(process.execPath, [resolve(root, "node_modules/prisma/build/index.js"), ...args, "--config", config], {
      cwd: root, env: { ...process.env, COMMERCIAL_V2_TEST_DATABASE_URL: url }, encoding: "utf8", windowsHide: true,
    });
    if (result.status !== 0) throw new Error(`PRISMA_${args[0]}_${args[1]}_FAILED: ${result.stderr}\n${result.stdout}`);
    return result.stdout;
  };
  return { run, config };
}
export async function verifyLegacySecurity(pool) {
  // No public RLS policies are present in the versioned baseline. Existing
  // manual policies need review instead of being silently certified.
  if ((await pool.query("SELECT 1 FROM pg_policies WHERE schemaname='public' LIMIT 1")).rowCount) throw new Error("BASELINE_UNTRACKED_RLS_POLICY_REQUIRES_REVIEW");
  for (const [name, value] of Object.entries(manifest.checks)) {
    const result = await pool.query('SELECT 1 FROM pg_constraint WHERE conname=$1 AND conrelid=$2::regclass AND contype=\'c\' AND convalidated', [name, `"${value.table}"`]);
    if (!result.rowCount) throw new Error(`BASELINE_CONSTRAINT_MISSING:${name}`);
  }
  for (const table of manifest.rlsTables) {
    const result = await pool.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass', [`"${table}"`]);
    if (!result.rows[0]?.relrowsecurity) throw new Error(`BASELINE_RLS_MISSING:${table}`);
  }
  for (const name of manifest.partialIndexes) {
    const result = await pool.query('SELECT 1 FROM pg_indexes WHERE schemaname=\'public\' AND indexname=$1', [name]);
    if (!result.rowCount) throw new Error(`BASELINE_INDEX_MISSING:${name}`);
  }
  const trigger = await pool.query("SELECT 1 FROM pg_trigger WHERE tgname='Appointment_capacity_guard' AND NOT tgisinternal");
  if (!trigger.rowCount) throw new Error("BASELINE_BOOKING_TRIGGER_MISSING");
}
export async function deployCommercialMigrations(databaseUrl, mode = "bootstrap") {
  const url = localCommercialDatabase(databaseUrl);
  if (!["bootstrap", "legacy"].includes(mode)) throw new Error("INVALID_MIGRATION_MODE");
  const pool = new pg.Pool({ connectionString: url });
  const { run } = prepareCommercialMigrationConfig(url);
  try {
    const historyExists = (await pool.query("SELECT to_regclass('public._prisma_migrations') AS table_name")).rows[0].table_name;
    const recorded = historyExists ? (await pool.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows : [];
    if (historyExists && (await pool.query('SELECT 1 FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rowCount) throw new Error("FAILED_HISTORY_REQUIRES_REVIEW");
    const baselineRecorded = recorded.some(row => row.migration_name === baselineName);
    if (!baselineRecorded) {
      if (mode === "bootstrap") {
        const count = await pool.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'");
        if (count.rows[0].count !== 0) throw new Error("BOOTSTRAP_REQUIRES_EMPTY_DATABASE");
      } else {
        const diff = run(["migrate", "diff", "--from-config-datasource", "--to-schema", resolve(root, "prisma/bootstrap/legacy.prisma"), "--script"]);
        if (!diff.includes("This is an empty migration")) throw new Error("LEGACY_SCHEMA_DRIFT_REQUIRES_REVIEW");
        await verifyLegacySecurity(pool);
        // Supported baseline marker, only AFTER checking the actual schema.
        // Historical rows stay in place and are never edited or deleted.
        run(["migrate", "resolve", "--applied", baselineName]);
      }
    }
    run(["migrate", "deploy"]);
    const diff = run(["migrate", "diff", "--from-config-datasource", "--to-schema", resolve(root, "prisma/schema.prisma"), "--script"]);
    if (!diff.includes("This is an empty migration")) throw new Error("FINAL_SCHEMA_DRIFT");
    await verifyLegacySecurity(pool);
    for (const table of ["CommercialWorkerState","PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit","CfPolicy","CfCampaign","CfVersion","CfAuthorization","CfConsent","CfSuppression","CfEnrollment","CfMessage","CfOutbox","CfAttempt","CfSimulatedReceipt","CfProviderEvent","CfQuotaBucket","CfQuotaReservation","CfQuotaAllocation","CfToken","CfAttribution","CfAudit"]) {
      const security=await pool.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[`"${table}"`]);
      if(!security.rows[0]?.relrowsecurity) throw new Error(`GROWTH_RLS_MISSING:${table}`);
      for(const role of ["anon","authenticated"]) {
        const grants=await pool.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS access",[role,`"${table}"`]);
        if(grants.rows[0]?.access) throw new Error(`GROWTH_PUBLIC_GRANT:${table}:${role}`);
      }
    }
    return { mode, schemaMatches: true, baselineRecorded: true };
  } finally { await pool.end(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  deployCommercialMigrations(process.env.COMMERCIAL_V2_TEST_DATABASE_URL, process.argv[2] || "bootstrap")
    .then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
