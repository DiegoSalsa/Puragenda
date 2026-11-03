// Real restore verification. Only a generated loopback clone is ever changed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { localCommercialDatabase } from "./commercial-migrations.mjs";

const root = process.cwd();
const state = JSON.parse(fs.readFileSync("scratch/next-staging/current.json", "utf8"));
const target = path.resolve(state.target);
assert(target.startsWith(path.resolve("scratch/next-staging") + path.sep));
const env = JSON.parse(fs.readFileSync(path.join(target, "staging-runtime.private.json"), "utf8"));
const source = new URL(localCommercialDatabase(env.DATABASE_URL));
assert.equal(source.hostname, "127.0.0.1");
assert.match(source.pathname, /^\/puragenda_commercial_test_rc[a-f0-9]{12}$/);
const cloneName = `puragenda_commercial_test_restore${randomBytes(6).toString("hex")}`;
const clone = new URL(source); clone.pathname = `/${cloneName}`;
const adminUrl = new URL(source); adminUrl.pathname = "/postgres";
const bin = process.env.PG_BIN_DIR ?? (process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin" : "");
const binary = name => path.join(bin, name + (process.platform === "win32" ? ".exe" : ""));
const out = path.resolve("scratch/final-launch/backup");
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const archive = path.join(out, `${cloneName}.dump`);
const admin = new pg.Client({ connectionString: adminUrl.href });
const src = new pg.Client({ connectionString: source.href });
const restored = new pg.Client({ connectionString: clone.href });
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function snapshot(client) {
  const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  const data = [];
  for (const { tablename } of tables) {
    const rows = (await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${quote(tablename)} t ORDER BY to_jsonb(t)::text COLLATE "C"`)).rows.map(r => r.row);
    data.push({ table: tablename, count: rows.length, sha256: hash(rows) });
  }
  const metadata = (await client.query(`SELECT 'rls' AS kind,c.relname AS name,c.relrowsecurity::text||':'||c.relforcerowsecurity::text AS definition FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'
    UNION ALL SELECT 'policy',tablename||':'||policyname,concat_ws('|',roles::text,cmd,qual,with_check) FROM pg_policies WHERE schemaname='public'
    UNION ALL SELECT 'constraint',c.relname||':'||k.conname,CASE WHEN k.contype='c' THEN 'CHECK:validated='||k.convalidated::text ELSE pg_get_constraintdef(k.oid) END FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    ORDER BY 1,2,3`)).rows;
  return { data, metadata };
}
function pgCommand(command, database, args) {
  execFileSync(binary(command), ["--host", source.hostname, "--port", source.port || "5432", "--username", decodeURIComponent(source.username), "--no-password", "--dbname", database, ...args], {
    cwd: root, windowsHide: true, stdio: "pipe", env: { ...process.env, PGPASSWORD: decodeURIComponent(source.password) },
  });
}
const started = Date.now(); let created = false, cloneConnected = false;
await admin.connect(); await src.connect();
try {
  const version = Number((await src.query("SHOW server_version_num")).rows[0].server_version_num);
  assert.equal(Math.floor(version / 10000), 17, "PostgreSQL 17 is required for this certification");
  const before = await snapshot(src);
  pgCommand("pg_dump", source.pathname.slice(1), ["--format=custom", "--file", archive]);
  await admin.query(`CREATE DATABASE ${quote(cloneName)}`); created = true;
  pgCommand("pg_restore", cloneName, ["--exit-on-error", archive]);
  await restored.connect(); cloneConnected = true;
  assert.deepEqual(await snapshot(restored), before);
  const marker = await restored.query('UPDATE "Business" SET name=name||\' RESTORE_PROBE\' WHERE id=(SELECT id FROM "Business" ORDER BY id LIMIT 1)');
  assert.equal(marker.rowCount, 1, "Synthetic clone requires one business to mutate");
  assert.notEqual(hash(await snapshot(restored)), hash(before));
  await restored.end(); cloneConnected = false;
  pgCommand("pg_restore", cloneName, ["--clean", "--if-exists", "--exit-on-error", archive]);
  const check = new pg.Client({ connectionString: clone.href }); await check.connect();
  try { assert.deepEqual(await snapshot(check), before); } finally { await check.end(); }
  assert.deepEqual(await snapshot(src), before, "Source staging must be unchanged");
  // PostgreSQL normalizes nested AND nodes when restoring CHECK expressions;
  // compare their names/validation and test their behavior in migration suites.
  // FK/PK/UNIQUE definitions and RLS policies are compared verbatim above.
  const report = { passed: true, syntheticOnly: true, sourceUnchanged: true, mutationRevertedByRestore: true, tableCount: before.data.length,
    constraintComparison: "FK/PK/UNIQUE definitions, RLS and CHECK names/validation; CHECK behavior covered separately",
    rowCount: before.data.reduce((n,t)=>n+t.count,0), fullDataSha256: hash(before.data), rlsAndConstraintsSha256: hash(before.metadata),
    archiveSha256: createHash("sha256").update(fs.readFileSync(archive)).digest("hex"), elapsedMs: Date.now()-started, postgresMajor: 17 };
  fs.writeFileSync(path.join(out,"result.json"), JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally {
  if (cloneConnected) await restored.end(); await src.end();
  if (created) { assert.match(cloneName, /^puragenda_commercial_test_restore[a-f0-9]{12}$/); await admin.query(`DROP DATABASE ${quote(cloneName)}`); }
  await admin.end();
}
