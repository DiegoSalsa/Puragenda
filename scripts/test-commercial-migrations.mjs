import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { deployCommercialMigrations, localCommercialDatabase } from "./commercial-migrations.mjs";
const base = new URL(localCommercialDatabase(process.env.COMMERCIAL_V2_TEST_DATABASE_URL));
const adminUrl = new URL(base); adminUrl.pathname = "/postgres";
const admin = new pg.Pool({ connectionString: adminUrl.href });
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const names = [`puragenda_commercial_bootstrap_test_${suffix}`, `puragenda_commercial_legacy_test_${suffix}`];
const urls = names.map(name => { const url = new URL(base); url.pathname = `/${name}`; return url.href; });
try {
  for (const name of names) await admin.query(`CREATE DATABASE "${name}"`);
  assert.deepEqual(await deployCommercialMigrations(urls[0]), { mode: "bootstrap", schemaMatches: true, baselineRecorded: true });
  const fresh = new pg.Pool({ connectionString: urls[0] });
  try {
    const before = (await fresh.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
    await deployCommercialMigrations(urls[0]);
    assert.deepEqual((await fresh.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows, before);
  } finally { await fresh.end(); }
  const legacy = new pg.Pool({ connectionString: urls[1] });
  try {
    // Representative legacy schema including non-Prisma checks/RLS/trigger.
    await legacy.query(readFileSync("prisma/bootstrap/00000000000000_legacy/migration.sql", "utf8"));
    await legacy.query(`INSERT INTO "Business" (id,name,slug,"apiKey","updatedAt") VALUES ('legacy-fixture','Anonymous','legacy-fixture','fixture-key',now());
      INSERT INTO "Subscription" (id,"businessId",plan,status,"freeMonthsRemaining","extraStaffCount","paymentMethod","customMonthlyPriceClp","updatedAt")
      VALUES ('legacy-sub','legacy-fixture','EQUIPO','ACTIVE',2,3,'BANK_TRANSFER',9990,now());
      INSERT INTO "WebsiteAddon" (id,"businessId",status,provider,"updatedAt") VALUES ('legacy-web','legacy-fixture','ACTIVE','mercadopago',now());`);
    // This old migration's full effect (the actual FK) exists and is verified
    // before resolving it. Its history row then must survive reconciliation.
    const fk = await legacy.query("SELECT 1 FROM pg_constraint WHERE conname='BookingOperation_businessId_fkey' AND confupdtype='c'");
    assert.equal(fk.rowCount, 1);
    const resolved = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "resolve", "--applied", "20261001121000_booking_operation_fk_update"], {
      env: { ...process.env, DIRECT_URL: urls[1] }, encoding: "utf8", windowsHide: true,
    });
    assert.equal(resolved.status, 0, resolved.stderr);
    const oldHistory = (await legacy.query('SELECT * FROM _prisma_migrations')).rows;
    const readData = async () => Promise.all(["Business", "Subscription", "WebsiteAddon"].map(async table => (await legacy.query(`SELECT * FROM "${table}" ORDER BY id`)).rows));
    const before = await readData();
    await deployCommercialMigrations(urls[1], "legacy");
    assert.deepEqual(await readData(), before);
    assert.deepEqual((await legacy.query('SELECT * FROM _prisma_migrations WHERE migration_name=$1', [oldHistory[0].migration_name])).rows, oldHistory);
    const history = (await legacy.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows;
    await deployCommercialMigrations(urls[1], "legacy");
    assert.deepEqual(await readData(), before);
    assert.deepEqual((await legacy.query('SELECT * FROM _prisma_migrations ORDER BY migration_name')).rows, history);
  } finally { await legacy.end(); }
  console.log(JSON.stringify({ bootstrap: "passed", legacyUpgrade: "passed", schemaMatches: true, legacyDataUnchanged: true,
    historyPreserved: true, repeatedDeployUnchanged: true, databases: names }));
} finally { await admin.end(); }
