import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import assert from 'node:assert/strict';

// Fixed local cluster. Never consult DATABASE_URL or the project's .env.
const root = 'postgresql://websiteqa@127.0.0.1:55439/';
const name = `website_migration_${Date.now()}`;
const scratch = path.resolve('scratch', name);
fs.mkdirSync(scratch, { recursive: true });
const mainSchema = path.join(scratch, 'main.prisma');
fs.writeFileSync(mainSchema, execFileSync('git', ['show', 'main:prisma/schema.prisma']));
const prisma = (args, database) => execFileSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: root + database, DIRECT_URL: root + database } });
const admin = new pg.Client({ connectionString: root + 'postgres' });
await admin.connect();
await admin.query(`CREATE DATABASE "${name}"`);
const db = new pg.Client({ connectionString: root + name });
await db.connect();
try {
  const baseline = prisma(['migrate', 'diff', '--from-empty', '--to-schema', mainSchema, '--script'], name);
  await db.query(baseline);
  const migrations = execFileSync('git', ['diff', '--name-only', 'main', '--', 'prisma/migrations'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(file => file.endsWith('/migration.sql')).sort();
  // Include an uncommitted incremental migration during development.
  for (const directory of fs.readdirSync('prisma/migrations')) {
    const file = `prisma/migrations/${directory}/migration.sql`;
    if (directory.startsWith('20261001') && fs.existsSync(file) && !migrations.includes(file)) migrations.push(file);
  }
  migrations.sort();
  for (const file of migrations) {
    await db.query(fs.readFileSync(file, 'utf8'));
    console.log(`PASS ${file}`);
    if (file.includes('websites_addon_v1')) {
      const tables = await db.query(`SELECT to_regclass('public."BusinessWebsite"') AS website, to_regclass('public."WebsiteMedia"') AS media`);
      assert.ok(tables.rows[0].website); assert.equal(tables.rows[0].media, null);
      console.log('PASS baseline MAIN -> V1 checkpoint (WebsiteMedia absent)');
    }
    if (file.includes('visual_builder_v2')) {
      const fields = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='WebsiteDomain'`);
      for (const field of ['provider', 'dnsRecords', 'checkedAt']) assert.ok(fields.rows.some(row => row.column_name === field));
      assert.ok((await db.query(`SELECT to_regclass('public."WebsiteMedia"') AS media`)).rows[0].media);
      console.log('PASS V1 -> V2 WebsiteMedia and domain fields');
      await db.query(`INSERT INTO "User" (id,email,password,name,"updatedAt") VALUES ('legacy-owner','legacy@example.test','local-only','Legacy',NOW())`);
      await db.query(`INSERT INTO "Business" (id,name,slug,"apiKey","ownerId","updatedAt") VALUES ('legacy-business','Legacy','legacy-business','local-only','legacy-owner',NOW())`);
      await db.query(`INSERT INTO "BusinessWebsite" (id,"businessId",subdomain,"draftConfig","updatedAt") VALUES ('legacy-site','legacy-business','legacy-site','{}',NOW())`);
      await db.query(`INSERT INTO "WebsiteDomain" (id,"websiteId",hostname,status,"verificationToken","isPrimary",provider,"verifiedAt","activatedAt","updatedAt") VALUES ('legacy-domain','legacy-site','legacy.example.cl','ACTIVE','old-provider-token',true,'vercel',NOW(),NOW(),NOW())`);
    }
    if (file.includes('domain_tenant_ownership')) {
      const domain = (await db.query('SELECT * FROM "WebsiteDomain" WHERE id=$1', ['legacy-domain'])).rows[0];
      assert.equal(domain.status, 'PENDING');assert.equal(domain.isPrimary,false);assert.equal(domain.tenantVerifiedAt,null);assert.equal(domain.verifiedAt,null);
      assert.ok(domain.verificationToken.startsWith('puragenda-verify='));assert.equal(domain.dnsRecords[0].value,domain.verificationToken);
      console.log('PASS legacy ACTIVE requires new tenant TXT; reservation retained');
    }
  }
  const drift = prisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'], name);
  console.log(drift.trim());
  const rls = await db.query(`SELECT relname, relrowsecurity FROM pg_class WHERE relname = ANY($1)`, [['BusinessWebsite', 'WebsiteMedia', 'WebsiteDomain', 'WebsiteAddon', 'DomainRequest', 'WebsiteBillingEvent']]);
  assert.equal(rls.rows.length, 6); assert.ok(rls.rows.every(row => row.relrowsecurity));
  console.log(`PASS NO DRIFT + RLS. Disposable local database retained: ${name}`);
} finally { await db.end(); await admin.end(); }
