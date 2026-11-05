import { randomBytes } from "node:crypto";
import { renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import pg from "pg";
import { localCommercialDatabase, prepareCommercialMigrationConfig } from "./commercial-migrations.mjs";
const source = new URL(localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL));
const withoutRoles = process.argv.includes("--without-supabase-roles");
const adminUrl = new URL(source); adminUrl.pathname = "/postgres";
const name = `puragenda_commercial_test_upgrade${randomBytes(6).toString("hex")}`;
const admin = new pg.Client({ connectionString: adminUrl.href }); await admin.connect();
try {
  const roles = (await admin.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')")).rows;
  assert.equal(roles.length, withoutRoles ? 0 : 2, "Use a separate owned cluster for the no-Supabase-roles scenario");
  // Frozen pre-RC1 history itself references these roles. Reconstruct that
  // history with fixture-only roles, then remove them before applying audit 04.
  if (withoutRoles) await admin.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN");
  await admin.query("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='audit04_public_probe') THEN CREATE ROLE audit04_public_probe NOLOGIN; END IF; END $$");
  await admin.query(`CREATE DATABASE "${name}"`);
} finally { await admin.end(); }
source.pathname = `/${name}`;
const { run, config } = prepareCommercialMigrationConfig(source.href);
const root = path.dirname(config), migration = "20261030120000_client_portal_privacy";
const added = path.resolve(root, "migrations", migration), held = path.resolve(root, migration);
const owned = path.resolve("scratch") + path.sep;
assert(added.startsWith(owned) && held.startsWith(owned));
renameSync(added, held); run(["migrate", "deploy"]);
const db = new pg.Client({ connectionString: source.href }); await db.connect();
const checks = [];
const check = (name, ok) => { assert(ok, name); checks.push(name); console.log("PASS " + name); };
try {
  await db.query(`
    INSERT INTO "Business" (id,name,slug,"apiKey","updatedAt") VALUES ('upgrade-business','Synthetic','audit04-upgrade','synthetic-upgrade',NOW());
    INSERT INTO "Service" (id,"businessId",name,price,duration) VALUES ('upgrade-service','upgrade-business','Synthetic',1,30);
    INSERT INTO "Client" (id,"businessId",name,email,"updatedAt") VALUES ('upgrade-client','upgrade-business','Synthetic','alice@upgrade.invalid',NOW()),('upgrade-mixed','upgrade-business','Synthetic','mixed@upgrade.invalid',NOW()),('upgrade-no-history','upgrade-business','Synthetic','unknown@upgrade.invalid',NOW());
    INSERT INTO "Appointment" (id,"businessId","serviceId","clientId","customerName","customerEmail","startTime","endTime",status,"updatedAt") VALUES
      ('upgrade-appointment','upgrade-business','upgrade-service','upgrade-client','Synthetic','alice@upgrade.invalid','2026-01-01 10:00Z','2026-01-01 10:30Z','COMPLETED',NOW()),
      ('upgrade-mixed-a','upgrade-business','upgrade-service','upgrade-mixed','Synthetic','a@upgrade.invalid','2026-01-02 10:00Z','2026-01-02 10:30Z','COMPLETED',NOW()),
      ('upgrade-mixed-b','upgrade-business','upgrade-service','upgrade-mixed','Synthetic','b@upgrade.invalid','2026-01-03 10:00Z','2026-01-03 10:30Z','COMPLETED',NOW());
    UPDATE "Client" SET email='bob@upgrade.invalid' WHERE id='upgrade-client';
    INSERT INTO "RecurringPlan" (id,"serviceId","requiresHealthForm","updatedAt") VALUES ('upgrade-plan','upgrade-service',true,NOW());
    INSERT INTO "RecurringBooking" (id,"businessId","serviceId","recurringPlanId","customerName","customerEmail","selectedDays","selectedTimes","startDate","endDate","durationMonths","healthAccepted","managementToken","updatedAt") VALUES ('upgrade-booking','upgrade-business','upgrade-service','upgrade-plan','Synthetic','alice@upgrade.invalid',ARRAY[1],'{"1":"10:00"}','2026-01-01','2027-01-01',1,true,'synthetic-historical-locator',NOW());
    INSERT INTO "ClientPortalAccount" (id,email,"passwordHash",name,"emailVerifiedAt","updatedAt") VALUES ('upgrade-account','alice@upgrade.invalid','synthetic-disabled','Synthetic',NOW(),NOW());
    INSERT INTO "ClientPortalSession" (id,"accountId","tokenHash","expiresAt") VALUES ('upgrade-session','upgrade-account','synthetic-historical-hash',NOW()+INTERVAL '400 days');
  `);
  const before = (await db.query('SELECT "expiresAt" FROM "ClientPortalSession" WHERE id=\'upgrade-session\'')).rows[0].expiresAt;
  const tables = ["Client", "Appointment", "RecurringBooking", "ClientPortalAccount", "ClientPortalSession"];
  const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table, (await db.query(`SELECT * FROM "${table}" ORDER BY id`)).rows])));
  const historical = await snapshot();
  if (withoutRoles) {
    assert.equal((await db.query("SELECT count(*)::int n FROM pg_class WHERE relowner IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon','authenticated'))")).rows[0].n, 0);
    await db.query("DROP OWNED BY anon, authenticated; DROP ROLE anon; DROP ROLE authenticated");
    check("Supabase roles are absent before the actual RC1 to audit 04 upgrade", (await db.query("SELECT count(*)::int n FROM pg_roles WHERE rolname IN ('anon','authenticated')")).rows[0].n === 0);
  }
  // Exercise PUBLIC and default grants on new tables in both PostgreSQL variants.
  const publicRoles = withoutRoles ? "PUBLIC" : "PUBLIC, anon, authenticated";
  await db.query(`GRANT ALL ON "Client", "Appointment", "RecurringBooking" TO ${publicRoles}; ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO ${publicRoles}; SET ROLE audit04_public_probe`);
  const visibleBefore = (await db.query('SELECT count(*)::int n FROM "Client"')).rows[0].n;
  await db.query('RESET ROLE');
  check("Reproduces public table access before the migration", visibleBefore === 3);
  renameSync(held, added); run(["migrate", "deploy"]);
  const preserved = await snapshot();
  for (const table of tables) {
    const originalColumns = Object.keys(historical[table][0]);
    assert.deepEqual(preserved[table].map(row => Object.fromEntries(originalColumns.map(column => [column, row[column]]))), historical[table]);
    check(`${table} preserves every historical column and row`, true);
  }
  check("Migration backfills reservation snapshots without transferring ownership to an edited CRM email", (await db.query('SELECT "portalOwnerEmail" FROM "Client" WHERE id=\'upgrade-client\'')).rows[0].portalOwnerEmail === "alice@upgrade.invalid");
  check("Ambiguous and evidence-free legacy CRM identities are not silently assigned", (await db.query('SELECT count(*)::int n FROM "Client" WHERE id IN (\'upgrade-mixed\',\'upgrade-no-history\') AND "portalOwnerEmail" IS NULL')).rows[0].n === 2);
  const old = (await db.query('SELECT * FROM "RecurringBooking" WHERE id=\'upgrade-booking\'')).rows[0];
  check("Legacy health acceptance is preserved without inventing date, version or evidence", old.healthAccepted && old.healthAcceptedAt === null && old.healthConsentVersion === null && old.healthConsentSnapshot === null);
  check("Migration preserves historical plan locators and modern sessions", old.managementToken === "synthetic-historical-locator" && +(await db.query('SELECT "expiresAt" FROM "ClientPortalSession" WHERE id=\'upgrade-session\'')).rows[0].expiresAt === +before);
  await db.query('UPDATE "RecurringBooking" SET status=\'ACTIVE\' WHERE id=\'upgrade-booking\'');
  check("Existing contracts can change operational status without fabricated retrospective consent", (await db.query('SELECT "healthAcceptedAt" FROM "RecurringBooking" WHERE id=\'upgrade-booking\'')).rows[0].healthAcceptedAt === null);
  for (const table of ["ClientPortalIdentity", "ClientPortalRevocation"]) {
    check(`${table} enables RLS`, (await db.query("SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass", [`"${table}"`])).rows[0].relrowsecurity);
    for (const role of withoutRoles ? [] : ["anon", "authenticated"]) check(`${table} grants no public application access to ${role}`, !(await db.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') access", [role, `"${table}"`])).rows[0].access);
  }
  for (const table of ["Client", "Appointment", "RecurringBooking"]) {
    check(`${table} enables private-data RLS`, (await db.query("SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass", [`"${table}"`])).rows[0].relrowsecurity);
    for (const role of withoutRoles ? [] : ["anon", "authenticated"]) check(`${table} revokes inherited public Data API access for ${role}`, !(await db.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') access", [role, `"${table}"`])).rows[0].access);
  }
  for (const table of ["ClientPortalIdentity", "ClientPortalRevocation", "Client", "Appointment", "RecurringBooking"]) {
    check(`${table} revokes PUBLIC even with default grants`, !(await db.query("SELECT EXISTS (SELECT 1 FROM pg_class c, LATERAL aclexplode(c.relacl) a WHERE c.oid=$1::regclass AND a.grantee=0) access", [`"${table}"`])).rows[0].access);
    await db.query("SET ROLE audit04_public_probe");
    await assert.rejects(db.query(`SELECT * FROM "${table}"`), { code: "42501" });
    await db.query("RESET ROLE");
    check(`${table} denies the public probe role`, true);
  }
  check("Migration does not create Supabase roles", (await db.query("SELECT count(*)::int n FROM pg_roles WHERE rolname IN ('anon','authenticated')")).rows[0].n === (withoutRoles ? 0 : 2));
  const diff = run(["migrate", "diff", "--from-config-datasource", "--to-schema", path.resolve("prisma/schema.prisma"), "--script"]);
  check("Upgrade finishes without Prisma schema drift", diff.includes("This is an empty migration"));
  writeFileSync(`scratch/audit04/migration-upgrade-${withoutRoles ? "without" : "with"}-roles.json`, JSON.stringify({ passed: checks.length, checks, withoutRoles, localOnly: true, historicalDataDeleted: false }, null, 2));
} finally { await db.end(); }
