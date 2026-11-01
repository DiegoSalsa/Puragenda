// Independent-review QA: owned loopback staging only, with controlled DNS.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import pg from 'pg';
import { localCommercialDatabase } from './commercial-migrations.mjs';

const state = JSON.parse(fs.readFileSync('scratch/next-staging/current.json'));
const target = path.resolve(state.target);
assert(target.startsWith(path.resolve('scratch/next-staging') + path.sep));
const env = JSON.parse(fs.readFileSync(path.join(target, 'staging-runtime.private.json')));
assert(env.WEBSITE_QA === '1' && env.WEBSITE_MEDIA_MOCK === '1' && env.NEXT_STAGING_NETWORK_GUARD === '1');
localCommercialDatabase(env.DATABASE_URL);
if (process.argv.includes('--prepare-dns')) {
  // Only this disposable source copy is patched, before starting its Next process.
  // No runtime production flag or real DNS query is introduced into the product.
  const guard = path.join(target, 'scripts/next-staging-network-guard.mjs');
  const marker = '// AUDIT06_CONTROLLED_DNS';
  assert(!fs.readFileSync(guard, 'utf8').includes(marker), 'Prepare a fresh source copy before installing DNS fixture');
  fs.appendFileSync(guard, `\n${marker}\nimport dns from 'node:dns';\nif (process.env.NEXT_STAGING_NETWORK_GUARD === '1') {\n  dns.promises.resolveTxt = async hostname => {\n    if (!hostname.startsWith('_puragenda.') || !hostname.endsWith('.example.org')) throw new Error('QA_DNS_EXTERNAL_BLOCKED');\n    return [];\n  };\n  syncBuiltinESMExports();\n}\n`);
  console.log('Controlled empty TXT fixture installed exclusively in owned staging copy');
  process.exit(0);
}
const accounts = JSON.parse(fs.readFileSync(path.join(target, 'staging-accounts.private.json')));
assert(accounts.synthetic);
const db = new pg.Pool({ connectionString: env.DATABASE_URL });
const origin = 'http://127.0.0.1:3128', checks = [], output = 'scratch/audit06/review';
fs.mkdirSync(output, { recursive: true });
let cookie, browser, business, site, domainId, assetId, originalContract;
const check = (name, condition) => { assert(condition, name); checks.push(name); console.log('PASS ' + name); };
async function request(route, options = {}) {
  const response = await fetch(origin + route, { redirect: 'manual', ...options, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
  return { response, text: await response.text() };
}
async function action(name, args) {
  const manifest = JSON.parse(fs.readFileSync(path.join(target, '.next-websites-qa/dev/server/server-reference-manifest.json')));
  const id = Object.entries(manifest.node).find(([, entry]) => entry.exportedName === name && entry.filename?.endsWith('website.actions.ts'))?.[0];
  assert(id, `Compiled action ${name}`);
  const result = await request('/dashboard/website', { method: 'POST', headers: { 'next-action': id, 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(args) });
  assert.equal(result.response.status, 200);
  const lines = result.text.split('\n'), root = JSON.parse(lines.find(line => line.startsWith('0:')).slice(2));
  if (typeof root.a === 'string' && root.a.startsWith('$@')) {
    const prefix = root.a.slice(2) + ':', raw = lines.filter(line => line.startsWith(prefix)).at(-1)?.slice(prefix.length);
    assert(raw); return raw === '"$undefined"' ? undefined : JSON.parse(raw);
  }
  return root.a;
}
async function tenant(host, route = '/') {
  return new Promise((resolve, reject) => {
    const req = http.get(origin + route, { headers: { host, origin: `http://${host}` } }, res => {
      let text = ''; res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, text }));
    });
    req.on('error', reject);
  });
}
try {
  const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'registro-plus-20261028@rc.example.invalid', password: accounts.accounts[0].password }) });
  assert.equal(login.response.status, 200);
  cookie = login.response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  business = (await db.query('SELECT b.* FROM "Business" b JOIN "User" u ON u.id=b."ownerId" WHERE u.email=$1', ['registro-plus-20261028@rc.example.invalid'])).rows[0];
  site = (await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1', [business.id])).rows[0];
  assert.equal(site.status, 'PUBLISHED', 'Run the existing website HTTP fixture first');
  originalContract = (await db.query('SELECT "planCode" FROM "CommercialSubscription" WHERE "businessId"=$1', [business.id])).rows[0];
  const require = createRequire(path.resolve('scratch/audit06/browser/package.json'));
  const { chromium } = require('playwright');
  browser = await chromium.launch({ headless: true, executablePath: process.env.AUDIT06_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-first-run', '--disable-background-networking'] });
  const context = await browser.newContext();
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(url.hostname) || url.hostname.endsWith('.localhost') || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  await context.addCookies(cookie.split('; ').map(part => ({ name: part.slice(0, part.indexOf('=')), value: part.slice(part.indexOf('=') + 1), url: origin })));
  const changelog = fs.readFileSync('src/config/changelog.ts', 'utf8').match(/version:\s*"([^"]+)"/)[1];
  await context.addCookies([{ name: 'puragenda_changelog_seen', value: changelog, url: origin }]);
  const page = await context.newPage(), errors = [];
  page.setDefaultNavigationTimeout(90000); page.on('pageerror', error => errors.push(error.message));
  const custom = `audit06-review-${randomUUID()}.example.org`;
  domainId = randomUUID();
  await db.query('INSERT INTO "WebsiteDomain" (id,"websiteId",hostname,status,provider,"isPrimary","verificationToken","tenantVerifiedAt","updatedAt") VALUES ($1,$2,$3,\'ACTIVE\',\'pending\',true,$4,NOW()-interval \'25 hours\',NOW())', [domainId, site.id, custom, randomUUID()]);
  check('06-B expired custom domain is refused with controlled absent TXT', (await tenant(custom)).status === 404);
  const own = `${site.subdomain}.localhost:3128`, fallback = `http://${site.subdomain}.localhost`;
  check('06-B own Puragenda subdomain remains public', (await tenant(own)).status === 200);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(origin + '/dashboard/website', { waitUntil: 'domcontentloaded' });
    const dismiss = page.getByRole('button', { name: /Cerrar novedades|Cerrar anuncio de Sitio Web|Entendido/ }).first();
    if (await dismiss.count() && await dismiss.isVisible()) await dismiss.click();
    const notice = page.getByRole('status').filter({ hasText: 'Revisa la titularidad de' });
    await notice.waitFor({ state: 'visible' });
    check(`06-B ${width}px editor explains review and retains the domain`, (await notice.innerText()).includes(custom));
    check(`06-B ${width}px fallback link uses its own subdomain`, (await page.getByRole('link', { name: 'Abrir el sitio con la dirección de Puragenda' }).getAttribute('href')) === fallback);
    check(`06-B ${width}px editor has no link to the rejected domain`, await page.locator(`a[href="https://${custom}"]`).count() === 0);
    check(`06-B ${width}px review has no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(output, `dns-review-${width}.png`), fullPage: false });
  }
  check('06-B public canonical excludes the rejected primary domain', !(await tenant(own)).text.includes(`https://${custom}`));
  const domain = (await db.query('SELECT status,"isPrimary" FROM "WebsiteDomain" WHERE id=$1', [domainId])).rows[0];
  check('06-B rendering does not mutate ownership or remove its reservation', domain.status === 'ACTIVE' && domain.isPrimary);
  await db.query('UPDATE "WebsiteDomain" SET "tenantVerifiedAt"=NOW() WHERE id=$1', [domainId]);
  check('06-B a fresh bounded proof restores custom host routing', (await tenant(custom)).status === 200);
  // Exercise the compiled deletion action while the actual backend waits for Business.
  assetId = randomUUID();
  await db.query('INSERT INTO "WebsiteMedia" (id,"websiteId","publicId","secureUrl",width,height,format,bytes,usage,provider) VALUES ($1,$2,$3,$4,32,32,\'webp\',100,\'hero\',\'local\')', [assetId, site.id, `audit06/${assetId}`, `/website-media-qa/${business.id}/${assetId}.webp`]);
  const blocker = await db.connect(); let deleting;
  try {
    await blocker.query('BEGIN'); await blocker.query('SELECT id FROM "Business" WHERE id=$1 FOR UPDATE', [business.id]);
    const pid = (await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    deleting = action('removeWebsiteImage', [assetId]).then(value => ({ value }), error => ({ error }));
    let waiting = false;
    for (let attempt = 0; attempt < 200 && !waiting; attempt++) {
      waiting = (await db.query('SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type=\'Lock\' AND $1=ANY(pg_blocking_pids(pid))) AS waiting', [pid])).rows[0].waiting;
      if (!waiting) await new Promise(resolve => setTimeout(resolve, 25));
    }
    check('06-A compiled HTTP deletion is actually blocked behind Business', waiting);
    await blocker.query('UPDATE "CommercialSubscription" SET "planCode"=\'PURAGENDA\' WHERE "businessId"=$1', [business.id]);
    await blocker.query('COMMIT');
  } finally { await blocker.query('ROLLBACK'); blocker.release(); }
  const rejected = await deleting;
  assert(!rejected.error, rejected.error);
  check('06-A compiled HTTP action rejects the stale commercial grant', !!rejected.value?.error);
  check('06-A denied deletion preserves the library row', (await db.query('SELECT "deletedAt" FROM "WebsiteMedia" WHERE id=$1', [assetId])).rows[0].deletedAt === null);
  await db.query('UPDATE "CommercialSubscription" SET "planCode"=$1 WHERE "businessId"=$2', [originalContract.planCode, business.id]);
  check('06-A restored rights permit legitimate library deletion', !(await action('removeWebsiteImage', [assetId]))?.error);
  check('06-A successful retry marks the same row deleted', (await db.query('SELECT "deletedAt" FROM "WebsiteMedia" WHERE id=$1', [assetId])).rows[0].deletedAt !== null);
  check('Browser has no JavaScript exceptions', errors.length === 0);
  fs.writeFileSync(path.join(output, 'http-browser.json'), JSON.stringify({ passed: true, checks, browserErrors: errors, externalProviderCalls: 0 }, null, 2));
} finally {
  if (originalContract) await db.query('UPDATE "CommercialSubscription" SET "planCode"=$1 WHERE "businessId"=$2', [originalContract.planCode, business.id]);
  if (domainId) await db.query('DELETE FROM "WebsiteDomain" WHERE id=$1', [domainId]);
  if (assetId) await db.query('DELETE FROM "WebsiteMedia" WHERE id=$1', [assetId]);
  await browser?.close(); await db.end();
}
