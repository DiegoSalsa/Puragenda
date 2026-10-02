// Read-only production diagnostics. No env values, credentials, tenant IDs or PII in output.
import fs from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';
const env = { ...dotenv.parse(fs.readFileSync('.env')), ...process.env };
const required = ['DATABASE_URL', 'DIRECT_URL', 'AUTH_SECRET', 'NEXT_PUBLIC_APP_URL', 'WEBSITE_ROOT_DOMAIN', 'WEBSITE_CHECKOUT_ENABLED', 'WEBSITE_LAUNCH_ENABLED', 'WEBSITE_LAUNCH_AT', 'MERCADOPAGO_ACCESS_TOKEN', 'MERCADOPAGO_WEBHOOK_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const report = { at: new Date().toISOString(), mode: 'READ_ONLY', env: required.map(key => ({ key, present: !!env[key]?.trim() })), database: {}, mercadoPago: {} };
report.authConfigured = (env.AUTH_SECRET ?? env.NEXTAUTH_SECRET ?? '').length >= 32;
const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 10000 });
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  report.database.connected = true;
  report.database.readOnly = (await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only === 'on';
  report.database.tables = (await client.query(`SELECT c.relname AS name, c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN ('BusinessWebsite','WebsiteAddon','WebsiteOfferEligibility','WebsiteLaunchSnapshot','WebsiteCommercialEvent','WebsiteBillingEvent') ORDER BY c.relname`)).rows;
  report.database.addonColumns = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='WebsiteAddon' ORDER BY ordinal_position`)).rows.map(r => r.column_name);
  if ((await client.query(`SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS exists`)).rows[0].exists) {
    report.database.migrations = (await client.query('SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY migration_name')).rows;
  }
  report.database.businessCount = (await client.query('SELECT count(*)::int AS count FROM "Business" WHERE "deletedAt" IS NULL')).rows[0].count;
  // Snapshot candidates only, never write or print business IDs.
  if (env.WEBSITE_LAUNCH_AT && Number.isFinite(Date.parse(env.WEBSITE_LAUNCH_AT))) {
    report.database.founderDryRun = (await client.query(`SELECT count(*)::int AS candidates FROM "Business" b JOIN "Subscription" s ON s."businessId"=b.id WHERE b."deletedAt" IS NULL AND b."createdAt" <= $1 AND s.status='ACTIVE' AND s."isTrial"=false AND s."currentPeriodEnd" > $1`, [new Date(env.WEBSITE_LAUNCH_AT)])).rows[0];
  } else report.database.founderDryRun = { status: 'NOT_RUN', reason: 'WEBSITE_LAUNCH_AT missing/invalid' };
  await client.query('ROLLBACK');
} catch (error) { report.database.errorCode = error.code ?? 'CONNECTION_OR_QUERY_FAILED'; }
finally { await client.end().catch(() => {}); }
if (env.MERCADOPAGO_ACCESS_TOKEN) {
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(10000) });
    report.mercadoPago.httpStatus = response.status;
    if (response.ok) { const user = await response.json(); report.mercadoPago.siteId = user.site_id; }
  } catch { report.mercadoPago.status = 'UNREACHABLE'; }
}
const path = process.argv[2] || 'scratch/website-production-audit.json';
fs.mkdirSync(path.slice(0, path.lastIndexOf('/')) || '.', { recursive: true });
fs.writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
