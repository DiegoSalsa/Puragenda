import { randomBytes } from "node:crypto";
import { renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import pg from "pg";
import { localCommercialDatabase, prepareCommercialMigrationConfig } from "./commercial-migrations.mjs";
const source = new URL(localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL));
const adminUrl = new URL(source); adminUrl.pathname = "/postgres";
const name = `puragenda_commercial_test_upgrade${randomBytes(6).toString("hex")}`;
const admin = new pg.Client({ connectionString: adminUrl.href }); await admin.connect();
try { await admin.query(`CREATE DATABASE "${name}"`); } finally { await admin.end(); }
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
  // Simulate the documented Supabase default grants without touching any remote project.
  await db.query('GRANT SELECT ON "Client", "Appointment", "RecurringBooking" TO anon, authenticated; SET ROLE anon');
  const visibleBefore = (await db.query('SELECT count(*)::int n FROM "Client"')).rows[0].n;
  await db.query('RESET ROLE');
  check("Reproduces the legacy Data API exposure when public roles have table grants", visibleBefore === 3);
  renameSync(held, added); run(["migrate", "deploy"]);
  check("Migration backfills reservation snapshots without transferring ownership to an edited CRM email", (await db.query('SELECT "portalOwnerEmail" FROM "Client" WHERE id=\'upgrade-client\'')).rows[0].portalOwnerEmail === "alice@upgrade.invalid");
  check("Ambiguous and evidence-free legacy CRM identities are not silently assigned", (await db.query('SELECT count(*)::int n FROM "Client" WHERE id IN (\'upgrade-mixed\',\'upgrade-no-history\') AND "portalOwnerEmail" IS NULL')).rows[0].n === 2);
  const old = (await db.query('SELECT * FROM "RecurringBooking" WHERE id=\'upgrade-booking\'')).rows[0];
  check("Legacy health acceptance is preserved without inventing date, version or evidence", old.healthAccepted && old.healthAcceptedAt === null && old.healthConsentVersion === null && old.healthConsentSnapshot === null);
  check("Migration preserves historical plan locators and modern sessions", old.managementToken === "synthetic-historical-locator" && +(await db.query('SELECT "expiresAt" FROM "ClientPortalSession" WHERE id=\'upgrade-session\'')).rows[0].expiresAt === +before);
  await db.query('UPDATE "RecurringBooking" SET status=\'ACTIVE\' WHERE id=\'upgrade-booking\'');
  check("Existing contracts can change operational status without fabricated retrospective consent", (await db.query('SELECT "healthAcceptedAt" FROM "RecurringBooking" WHERE id=\'upgrade-booking\'')).rows[0].healthAcceptedAt === null);
  for (const table of ["ClientPortalIdentity", "ClientPortalRevocation"]) {
    check(`${table} enables RLS`, (await db.query("SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass", [`"${table}"`])).rows[0].relrowsecurity);
    for (const role of ["anon", "authenticated"]) check(`${table} grants no public application access to ${role}`, !(await db.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') access", [role, `"${table}"`])).rows[0].access);
  }
  for (const table of ["Client", "Appointment", "RecurringBooking"]) {
    check(`${table} enables private-data RLS`, (await db.query("SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass", [`"${table}"`])).rows[0].relrowsecurity);
    for (const role of ["anon", "authenticated"]) check(`${table} revokes inherited public Data API access for ${role}`, !(await db.query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') access", [role, `"${table}"`])).rows[0].access);
  }
  const diff = run(["migrate", "diff", "--from-config-datasource", "--to-schema", path.resolve("prisma/schema.prisma"), "--script"]);
  check("Upgrade finishes without Prisma schema drift", diff.includes("This is an empty migration"));
  writeFileSync("scratch/audit04/migration-upgrade.json", JSON.stringify({ passed: checks.length, checks, localOnly: true, historicalDataDeleted: false }, null, 2));
} finally { await db.end(); }
