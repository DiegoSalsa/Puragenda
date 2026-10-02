import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import pg from 'pg';
import { createHmac, randomUUID } from 'node:crypto';
const db = new pg.Client({ connectionString: 'postgresql://websiteqa@127.0.0.1:55439/websiteqa' });
await db.connect();
const report = { at: new Date().toISOString(), provider: 'PASS_SIMULATED', cases: [] };
function check(name, condition) { assert.ok(condition, name); report.cases.push({ name, status: 'PASS_REAL_LOCAL' }); }
async function session(tenant) {
  const user = (await db.query('SELECT id,email,name,role,"tokenVersion","isSuperAdmin" FROM "User" WHERE id=$1', [`website-qa-${tenant}-owner`])).rows[0];
  const payload = Buffer.from(JSON.stringify({ ...user, v: 3, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
  return `puragenda_session=${payload}.${createHmac('sha256', 'local-website-qa-auth-secret-isolated-2026').update(payload).digest('base64url')}; puragenda_changelog_seen=v2.2.0`;
}
const cookies = { a: await session('a'), b: await session('b') };
function call(path, tenant = 'a', options = {}, publicSite = false) {
  const host = publicSite ? `bella-${tenant}.localhost:3005` : 'localhost:3005';
  return new Promise((resolve, reject) => {
    const req = http.request(`http://127.0.0.1:3005${path}`, { method: options.method || 'GET', headers: { host, origin: `http://${host}`, ...(publicSite ? {} : { cookie: cookies[tenant] }), ...options.headers } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString() }));
    }); req.on('error', reject); if (options.body) req.write(options.body); req.end();
  });
}
async function action(name, args = [], tenant = 'a') {
  const manifest = JSON.parse(fs.readFileSync('.next-websites-qa/dev/server/server-reference-manifest.json'));
  const id = Object.entries(manifest.node).find(([, e]) => e.exportedName === name && e.filename?.endsWith('website.actions.ts'))?.[0];
  assert.ok(id, `Compiled action ${name}`);
  const response = await call('/dashboard/website', tenant, { method: 'POST', headers: { 'next-action': id, 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(args) });
  const root = response.text.split('\n').find(l => l.startsWith('0:'));
  const reference = root && JSON.parse(root.slice(2)).a;
  if (typeof reference === 'string' && reference.startsWith('$@')) {
    const line = response.text.split('\n').filter(l => l.startsWith(reference.slice(2) + ':')).at(-1);
    return JSON.parse(line.slice(line.indexOf(':') + 1));
  }
  throw new Error(`Unverifiable action ${name}`);
}
const site = async tenant => (await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1', [`website-qa-${tenant}`])).rows[0];
try {
  await call('/dashboard/website');
  await call('/dashboard/website');
  check('trial expiry audit deduplicates repeated managed visits', (await db.query('SELECT count(*)::int AS count FROM "WebsiteCommercialEvent" WHERE "businessId"=$1 AND event=$2', ['website-qa-a', 'website_trial_expired'])).rows[0].count === 1);
  const offer = (await db.query('SELECT * FROM "WebsiteOfferEligibility" WHERE "businessId"=$1', ['website-qa-a'])).rows[0];
  check('founder permanent eligibility retained after expiry', offer?.offerCode === 'BETA_FOUNDER' && !!offer.trialConsumedAt);
  check('expired unpaid founder public runtime stops', (await call('/', 'a', {}, true)).status === 404);
  const before = await site('a');
  const op = (await db.query('SELECT o.* FROM "WebsiteCheckoutOperation" o JOIN "WebsiteAddon" a ON a.id=o."addonId" WHERE a."businessId"=$1 ORDER BY o."createdAt" DESC LIMIT 1', ['website-qa-a'])).rows[0];
  assert.ok(op, 'Existing local simulated founder checkout');
  const simulated = await call('/api/website/payment-simulator', 'a', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operation: op.id, action: 'approved' }) });
  check('verified simulator invoice activates founder', simulated.status === 200);
  check('activation preserves draft and publication snapshots', JSON.stringify((await site('a')).draftConfig) === JSON.stringify(before.draftConfig) && JSON.stringify((await site('a')).publishedConfig) === JSON.stringify(before.publishedConfig));
  check('base MP subscription unaffected by website activation', (await db.query('SELECT status FROM "Subscription" WHERE "businessId"=$1', ['website-qa-a'])).rows[0].status === 'ACTIVE');
  for (const template of ['bella', 'matchday', 'ritual']) {
    const old = await site('a');
    if (old.templateKey !== template) check(`${template}: actual authenticated template selection`, !(await action('switchWebsiteTemplate', [template, 1, old.revision]))?.error);
    const current = await site('a');
    if (old.templateKey !== template) check(`${template}: switching draft preserves published template`, current.publishedTemplateKey === old.publishedTemplateKey);
    const config = { ...current.draftConfig, seoTitle: `QA ${template} site`, seoDescription: `QA ${template} description` };
    const saved = await action('saveWebsiteDraft', [config, current.revision, current.subdomain, template]);
    check(`${template}: actual autosave revision`, saved?.revision === current.revision + 1);
    const stale = await action('saveWebsiteDraft', [config, current.revision, current.subdomain, template]);
    check(`${template}: second-tab stale revision rejected`, !!stale?.error?.includes('otra sesión'));
    const publish = await action('publishWebsite', [saved.revision]);
    check(`${template}: actual authenticated publish`, !publish?.error);
    const html = await call('/', 'a', {}, true);
    check(`${template}: public runtime uses published snapshot`, html.status === 200 && html.text.includes(`QA ${template} site`));
    check(`${template}: SEO canonical and description`, html.text.includes('rel="canonical"') && html.text.includes(`QA ${template} description`));
    check(`${template}: JSON-LD tenant isolation`, html.text.includes('application/ld+json') && !html.text.includes('website-qa-b-local-only-key'));
    const date = new Date(Date.now()+3*86400000).toISOString().slice(0,10);
    const input = { serviceId: 'website-qa-a-permanente', locationId: 'website-qa-a-location', staffId: 'any', optionIds: [], date };
    const available = await call(`/api/website/availability?${new URLSearchParams({ ...input, optionIds: '' })}`, 'a', {}, true);
    const slot = JSON.parse(available.text).slots?.[0]; check(`${template}: canonical availability`, available.status === 200 && !!slot);
    const body = { ...input, staffId: slot.staffId, startTime: slot.startTime, customerName: 'Cliente QA', customerEmail: `preproduction-${randomUUID()}@example.test`, customerPhone: '+56911112222' };
    const options = { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() }, body: JSON.stringify(body) };
    const booking = await call('/api/website/book', 'a', options, true); const result = JSON.parse(booking.text);
    check(`${template}: real Appointment persisted (HTTP ${booking.status})`, booking.status >= 200 && booking.status < 300 && !!result.id && (await db.query('SELECT "businessId" FROM "Appointment" WHERE id=$1', [result.id])).rows[0]?.businessId === 'website-qa-a');
    const replay = await call('/api/website/book', 'a', options, true); check(`${template}: booking retry has same Appointment`, JSON.parse(replay.text).id === result.id);
    check(`${template}: competing booking loses`, (await call('/api/website/book', 'a', { ...options, headers: { ...options.headers, 'idempotency-key': randomUUID() } }, true)).status === 409);
    check(`${template}: foreign service cannot book tenant B`, (await call('/api/website/book', 'b', { ...options, headers: { ...options.headers, 'idempotency-key': randomUUID() } }, true)).status === 400);
  }
  check('three independent template draft snapshots retained', Object.keys((await site('a')).templateConfigs).length >= 3);
  const standardHtml = await call('/dashboard/changelog', 'b');
  check('standard changelog never offers founder price', standardHtml.text.includes('$9.990 / mes') && !standardHtml.text.includes('$5.990 / mes para siempre'));
  const b = await site('b'); const addonB = (await db.query('SELECT * FROM "WebsiteAddon" WHERE "businessId"=$1', ['website-qa-b'])).rows[0];
  // Only this named fixture is changed; production URLs are never consulted.
  await db.query(`UPDATE "WebsiteAddon" SET status='INACTIVE',"validUntil"=NULL,"mpSubscriptionId"=NULL,provider='mercadopago',"cancelAt"=NULL WHERE id=$1`, [addonB.id]);
  await db.query('DELETE FROM "WebsiteCheckoutOperation" WHERE "addonId"=$1', [addonB.id]);
  check('standard cannot publish without entitlement', !!(await action('publishWebsite', [b.revision], 'b'))?.error);
  const checkout = await action('activateWebsiteAddon', [{ amount: 5990, tier: 'BETA_FOUNDER', businessId: 'website-qa-a' }], 'b');
  check('standard actual checkout ignores tampered client fields', checkout?.provider === 'mercadopago');
  const opB = (await db.query('SELECT * FROM "WebsiteCheckoutOperation" WHERE "addonId"=$1', [addonB.id])).rows[0]; check('standard server-derived monthly price is 9990', opB.amount === 9990);
  check('standard pending cannot serve public site', (await call('/', 'b', {}, true)).status === 404);
  await call('/api/website/payment-simulator', 'b', { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:opB.id,action:'approved'}) });
  check('standard confirmed invoice allows actual publication', !(await action('publishWebsite', [(await site('b')).revision], 'b'))?.error);
  check('standard paid public site serves', (await call('/', 'b', {}, true)).status === 200);
  const foreignSimulator = await call('/api/website/payment-simulator', 'b', { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({operation:op.id,action:'cancelled'}) });
  check('simulator operation ownership enforced', foreignSimulator.status === 404);
  fs.mkdirSync('docs/websites/qa-preproduction', { recursive: true });
  fs.writeFileSync('docs/websites/qa-preproduction/commercial-http.json', JSON.stringify(report, null, 2)+'\n');
  console.log(`${report.cases.length} PASS: local real HTTP/DB; Mercado Pago provider PASS SIMULATED`);
} finally { await db.end(); }
