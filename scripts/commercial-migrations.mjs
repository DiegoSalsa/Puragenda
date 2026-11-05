import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import pg from "pg";
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const baselineName = "00000000000000_legacy";
const optionalRoleMigrations = [
  "20261022180000_commercial_migration_web_plus",
  "20261022210000_puri_plus_growth",
];
const optionalRoleMigrationExpectations = {
  "20261022180000_commercial_migration_web_plus": {
    tables: ["CommercialMigrationProposal", "CommercialWebsiteTransition", "CommercialMigrationEvidence"],
    indexes: [
      "CommercialMigrationProposal_idempotencyKey_key", "CommercialMigrationProposal_subscriptionId_businessId_idx",
      "CommercialMigrationProposal_businessId_status_effectiveAt_idx", "CommercialMigrationProposal_id_businessId_key",
      "CommercialMigrationProposal_one_open_business", "CommercialWebsiteTransition_proposalId_key",
      "CommercialWebsiteTransition_businessId_status_idx", "CommercialWebsiteTransition_proposalId_businessId_key",
      "CommercialMigrationEvidence_proposalId_businessId_state_idx", "CommercialMigrationEvidence_provider_eventId_key",
      "CommercialMigrationEvidence_provider_paymentId_key",
    ],
    constraints: [
      "CommercialMigrationProposal_pkey", "CommercialMigrationProposal_businessId_fkey", "CommercialMigrationProposal_subscriptionId_businessId_fkey",
      "CommercialMigrationProposal_status_check", "CommercialMigrationProposal_target_check", "CommercialMigrationProposal_approval_check",
      "CommercialWebsiteTransition_pkey", "CommercialWebsiteTransition_proposalId_businessId_fkey", "CommercialWebsiteTransition_status_check",
      "CommercialWebsiteTransition_evidence_check", "CommercialMigrationEvidence_pkey", "CommercialMigrationEvidence_proposalId_businessId_fkey",
      "CommercialMigrationEvidence_origin_check", "CommercialMigrationEvidence_state_check", "CommercialMigrationEvidence_money_check",
      "CommercialMigrationEvidence_period_check", "CommercialMigrationEvidence_confirmed_check",
    ],
    functions: ["commercial_migration_immutable_proposal"],
    triggers: ["CommercialMigrationProposal_immutable"],
  },
  "20261022210000_puri_plus_growth": {
    tables: ["PuriGrowthPolicy", "PuriGrowthRun", "PuriGrowthSignal", "PuriGrowthRecommendation", "PuriBudgetBucket", "PuriUsageReservation", "PuriGrowthAudit"],
    indexes: [
      "PuriGrowthRun_analysisKey_key", "PuriGrowthRun_businessId_scopeKey_status_periodEnd_idx", "PuriGrowthRun_status_leaseUntil_idx",
      "PuriGrowthRun_expiresAt_idx", "PuriGrowthRun_id_businessId_scopeKey_key", "PuriGrowthRun_businessId_scopeKey_proactiveCheckedAt_idx",
      "PuriGrowthSignal_dedupeKey_key", "PuriGrowthSignal_businessId_scopeKey_kind_materialHash_idx", "PuriGrowthSignal_businessId_scopeKey_status_expiresAt_idx",
      "PuriGrowthSignal_runId_businessId_scopeKey_idx", "PuriGrowthSignal_expiresAt_idx", "PuriGrowthSignal_id_businessId_scopeKey_key",
      "PuriGrowthRecommendation_dedupeKey_key", "PuriGrowthRecommendation_businessId_scopeKey_status_created_idx", "PuriGrowthRecommendation_signalId_businessId_scopeKey_idx",
      "PuriGrowthRecommendation_expiresAt_idx", "PuriGrowthRecommendation_id_businessId_scopeKey_key", "PuriBudgetBucket_businessId_category_periodStart_idx",
      "PuriBudgetBucket_periodStart_idx", "PuriUsageReservation_idempotencyKey_key", "PuriUsageReservation_businessId_category_createdAt_idx",
      "PuriUsageReservation_state_createdAt_idx", "PuriGrowthAudit_dedupeKey_key", "PuriGrowthAudit_businessId_event_createdAt_idx",
      "PuriGrowthAudit_recommendationId_businessId_scopeKey_idx", "PuriGrowthAudit_createdAt_idx",
    ],
    constraints: [
      "PuriRequest_capabilityTier_check", "PuriGrowthPolicy_pkey", "PuriGrowthPolicy_businessId_fkey", "PuriGrowthPolicy_frequency_check", "PuriGrowthRun_pkey", "PuriGrowthRun_businessId_fkey",
      "PuriGrowthRun_status_check", "PuriGrowthRun_kind_check", "PuriGrowthRun_period_check", "PuriGrowthRun_complete_check", "PuriGrowthSignal_pkey",
      "PuriGrowthSignal_runId_businessId_scopeKey_fkey", "PuriGrowthSignal_status_check", "PuriGrowthSignal_kind_check", "PuriGrowthSignal_confidence_check",
      "PuriGrowthRecommendation_pkey", "PuriGrowthRecommendation_signalId_businessId_scopeKey_fkey", "PuriGrowthRecommendation_status_check",
      "PuriGrowthRecommendation_no_execution", "PuriGrowthRecommendation_approval_check", "PuriGrowthRecommendation_strategy_check", "PuriGrowthRecommendation_cost_check",
      "PuriBudgetBucket_pkey", "PuriBudgetBucket_businessId_fkey", "PuriBudgetBucket_nonnegative", "PuriBudgetBucket_category", "PuriUsageReservation_pkey",
      "PuriUsageReservation_businessId_fkey", "PuriUsageReservation_amounts", "PuriUsageReservation_state", "PuriUsageReservation_category", "PuriGrowthAudit_pkey",
      "PuriGrowthAudit_businessId_fkey", "PuriGrowthAudit_recommendationId_businessId_scopeKey_fkey",
    ],
    functions: ["puri_growth_immutable_proposal"],
    triggers: ["PuriGrowthRecommendation_immutable"],
    columns: [{ table: "PuriRequest", column: "capabilityTier" }],
  },
};
const manifest = JSON.parse(readFileSync(resolve(root, "prisma/bootstrap/manifest.json"), "utf8"));
export function localCommercialDatabase(raw) {
  const url = new URL(raw || "postgres://invalid/invalid");
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || !/^\/puragenda_commercial_(test|bootstrap_test|legacy_test)(?:_[a-z0-9]+)?$/.test(url.pathname) || process.env.NODE_ENV === "production") throw new Error("ISOLATED_COMMERCIAL_DATABASE_REQUIRED");
  return url.href;
}
// This is an explicit exception for the independently verified empty staging
// resource. Local test runners retain their original loopback-only contract.
export function stagingCommercialDatabase(raw) {
  const target = JSON.parse(readFileSync(resolve(root, "config/release/puragenda-next-staging.json"), "utf8"));
  const url = new URL(raw || "postgres://invalid/invalid");
  const keys = [...url.searchParams.keys()];
  if (process.env.RC1_STAGING_CONFIRM !== target.name || process.env.VERCEL_ENV !== "preview" || process.env.NODE_ENV === "production" ||
      !["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== target.directHost ||
      url.pathname !== `/${target.database}` || decodeURIComponent(url.username) !== target.migrationRole ||
      !url.password || url.hash || (url.port && url.port !== "5432") ||
      keys.length !== 3 || new Set(keys).size !== 3 || keys.some(key => !["sslmode", "sslaccept", "channel_binding"].includes(key)) ||
      url.searchParams.get("sslmode") !== "require" || url.searchParams.get("sslaccept") !== "strict" ||
      url.searchParams.get("channel_binding") !== "require") throw new Error("ISOLATED_STAGING_DATABASE_REQUIRED");
  return url.href;
}
export function optionalRoleSafeMigrationSql(name) {
  const sql = readFileSync(resolve(root, "prisma/migrations", name, "migration.sql"), "utf8");
  if (!optionalRoleMigrations.includes(name)) return sql;
  const roleSafe = sql
    .replace(
      /REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM PUBLIC, anon, authenticated;/,
      () => `REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "CommercialMigrationProposal","CommercialWebsiteTransition","CommercialMigrationEvidence" FROM authenticated;
  END IF;
END $$;`,
    )
    .replace(
      /REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM PUBLIC, anon, authenticated;/,
      () => `REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit" FROM authenticated;
  END IF;
END $$;`,
    );
  if (roleSafe === sql || roleSafe.includes("FROM PUBLIC, anon, authenticated;")) throw new Error(`OPTIONAL_ROLE_GUARD_MISSING:${name}`);
  return roleSafe;
}
export function prepareCommercialMigrationConfig(databaseUrl, { before, staging = false } = {}) {
  const url = staging ? stagingCommercialDatabase(databaseUrl) : localCommercialDatabase(databaseUrl);
  mkdirSync(resolve(root, "scratch"), { recursive: true });
  const path = mkdtempSync(resolve(root, "scratch/migration-run-"));
  mkdirSync(resolve(path, "migrations"));
  cpSync(resolve(root, "prisma/bootstrap", baselineName), resolve(path, "migrations", baselineName), { recursive: true });
  for (const name of readdirSync(resolve(root, "prisma/migrations"))) {
    if (name >= manifest.cutoverMigration && name !== "migration_lock.toml" && (!before || name < before)) cpSync(resolve(root, "prisma/migrations", name), resolve(path, "migrations", name), { recursive: true });
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
export async function inspectOptionalRoleMigration(pool, name) {
  const expected = optionalRoleMigrationExpectations[name];
  if (!expected) throw new Error(`UNKNOWN_OPTIONAL_ROLE_MIGRATION:${name}`);
  const tables = await pool.query("SELECT count(*)::int AS count FROM pg_class WHERE relkind='r' AND relname = ANY($1::text[])", [expected.tables]);
  const indexes = await pool.query("SELECT count(*)::int AS count FROM pg_class WHERE relkind IN ('i','I') AND relname = ANY($1::text[])", [expected.indexes]);
  const constraints = await pool.query("SELECT count(*)::int AS count FROM pg_constraint WHERE conname = ANY($1::text[])", [expected.constraints]);
  const functions = await pool.query("SELECT count(*)::int AS count FROM pg_proc WHERE proname = ANY($1::text[])", [expected.functions]);
  const triggers = await pool.query("SELECT count(*)::int AS count FROM pg_trigger WHERE NOT tgisinternal AND tgname = ANY($1::text[])", [expected.triggers]);
  const rls = await pool.query("SELECT count(*)::int AS count FROM pg_class WHERE relname = ANY($1::text[]) AND relrowsecurity", [expected.tables]);
  const columns = expected.columns ? await pool.query("SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='public' AND (table_name, column_name) IN (SELECT * FROM unnest($1::text[], $2::text[]))", [expected.columns.map(item => item.table), expected.columns.map(item => item.column)]) : { rows: [{ count: 0 }] };
  const found = [tables, indexes, constraints, functions, triggers, rls, columns].reduce((sum, result) => sum + Number(result.rows[0]?.count ?? 0), 0);
  const required = expected.tables.length + expected.indexes.length + expected.constraints.length + expected.functions.length + expected.triggers.length + expected.tables.length + (expected.columns?.length ?? 0);
  if (found === 0) return "absent";
  if (found !== required) throw new Error(`OPTIONAL_ROLE_MIGRATION_PARTIAL:${name}:${found}/${required}`);
  for (const role of (await pool.query("SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])", [["anon", "authenticated"]])).rows.map(row => row.rolname)) {
    const access = await pool.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS access", [role, `"${expected.tables[0]}"`]);
    if (access.rows[0]?.access) throw new Error(`OPTIONAL_ROLE_MIGRATION_PUBLIC_GRANT:${name}:${role}`);
  }
  return "complete";
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
export async function deployCommercialMigrations(databaseUrl, mode = "bootstrap", { staging = false } = {}) {
  const url = staging ? stagingCommercialDatabase(databaseUrl) : localCommercialDatabase(databaseUrl);
  if (!["bootstrap", "legacy"].includes(mode)) throw new Error("INVALID_MIGRATION_MODE");
  if (staging && mode !== "bootstrap") throw new Error("STAGING_BOOTSTRAP_ONLY");
  const pgUrl = new URL(url);
  if (staging) pgUrl.searchParams.set("sslmode", "verify-full");
  const pool = new pg.Pool({ connectionString: pgUrl.href, ...(staging ? { enableChannelBinding: true, connectionTimeoutMillis: 15000 } : {}) });
  const { run } = prepareCommercialMigrationConfig(url, { staging });
  try {
    if (staging) {
      const client = await pool.connect();
      try {
        const target = JSON.parse(readFileSync(resolve(root, "config/release/puragenda-next-staging.json"), "utf8"));
        const identity = (await client.query("SELECT current_database() AS db,current_user AS role,current_setting('server_version_num')::int AS version,has_schema_privilege(current_user,'public','CREATE') AS can_create")).rows[0];
        if (identity.db !== target.database || identity.role !== target.migrationRole || Math.floor(identity.version / 10000) !== target.postgresMajor ||
            !identity.can_create || !client.connection.stream.encrypted || !client.connection.stream.authorized) throw new Error("STAGING_CONNECTION_IDENTITY_OR_TLS_MISMATCH");
      } finally { client.release(); }
    }
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
    const optionalPublicRoles = (await pool.query("SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[])", [["anon", "authenticated"]])).rows.map(row => row.rolname);
    const recordedNames = new Set(recorded.map(row => row.migration_name));
    if (optionalPublicRoles.length === 2) {
      run(["migrate", "deploy"]);
    } else {
      // Keep the historical SQL/checksum intact. On a standard PostgreSQL
      // cluster, execute only these optional-role revocations through a
      // guarded copy, verify the same schema, then let Prisma record the
      // original migration checksum with its supported resolve command.
      const prefix = prepareCommercialMigrationConfig(url, { before: optionalRoleMigrations[0], staging });
      prefix.run(["migrate", "deploy"]);
      for (const name of optionalRoleMigrations) {
        const state = await inspectOptionalRoleMigration(pool, name);
        if (recordedNames.has(name)) {
          if (state !== "complete") throw new Error(`OPTIONAL_ROLE_MIGRATION_HISTORY_MISMATCH:${name}`);
          continue;
        }
        if (state === "absent") {
          await pool.query(optionalRoleSafeMigrationSql(name));
          if ((await inspectOptionalRoleMigration(pool, name)) !== "complete") throw new Error(`OPTIONAL_ROLE_MIGRATION_SCHEMA_UNVERIFIED:${name}`);
          if (process.env.NODE_ENV === "test" && process.env.COMMERCIAL_MIGRATION_TEST_INTERRUPT_AFTER_SQL === name) throw new Error(`INTERRUPTED_AFTER_OPTIONAL_ROLE_SQL:${name}`);
        }
        if ((await inspectOptionalRoleMigration(pool, name)) !== "complete") throw new Error(`OPTIONAL_ROLE_MIGRATION_SCHEMA_UNVERIFIED:${name}`);
        run(["migrate", "resolve", "--applied", name]);
      }
      run(["migrate", "deploy"]);
    }
    const diff = run(["migrate", "diff", "--from-config-datasource", "--to-schema", resolve(root, "prisma/schema.prisma"), "--script"]);
    if (!diff.includes("This is an empty migration")) throw new Error("FINAL_SCHEMA_DRIFT");
    await verifyLegacySecurity(pool);
    for (const name of optionalRoleMigrations) await inspectOptionalRoleMigration(pool, name);
    for (const table of ["CommercialWorkerState","PuriGrowthPolicy","PuriGrowthRun","PuriGrowthSignal","PuriGrowthRecommendation","PuriBudgetBucket","PuriUsageReservation","PuriGrowthAudit","CfPolicy","CfCampaign","CfVersion","CfAuthorization","CfConsent","CfSuppression","CfEnrollment","CfMessage","CfOutbox","CfAttempt","CfSimulatedReceipt","CfProviderEvent","CfQuotaBucket","CfQuotaReservation","CfQuotaAllocation","CfToken","CfAttribution","CfAudit"]) {
      const security=await pool.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[`"${table}"`]);
      if(!security.rows[0]?.relrowsecurity) throw new Error(`GROWTH_RLS_MISSING:${table}`);
      for(const role of optionalPublicRoles) {
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
