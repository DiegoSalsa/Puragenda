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
const accounts = JSON.parse(fs.readFileSync(path.join(target, 'staging-accounts.private.json')));
assert(accounts.synthetic && env.WEBSITE_MEDIA_MOCK === '1' && env.NEXT_STAGING_NETWORK_GUARD === '1');
const db = new pg.Pool({ connectionString: localCommercialDatabase(env.DATABASE_URL) });
pg.types.setTypeParser(1114, value => new Date(value + 'Z'));
const origin = 'http://127.0.0.1:3128', checks = [], screenshots = [];
const check = (name, condition) => { assert(condition, name); checks.push(name); console.log('PASS ' + name); };
const output = path.resolve('scratch/audit06');
fs.mkdirSync(path.join(output, 'screenshots'), { recursive: true });
let cookie, browser, original, business, domainId;
async function request(route, options = {}) {
  const r = await fetch(origin + route, { redirect: 'manual', ...options, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
  return { response: r, text: await r.text() };
}
async function action(name, args) {
  const manifest = JSON.parse(fs.readFileSync(path.join(target, '.next-websites-qa/dev/server/server-reference-manifest.json')));
  const id = Object.entries(manifest.node).find(([, e]) => e.exportedName === name && e.filename?.endsWith('website.actions.ts'))?.[0];
  assert(id, `Compiled action ${name}`);
  const r = await request('/dashboard/website', { method: 'POST', headers: { 'next-action': id, 'content-type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(args) });
  assert.equal(r.response.status, 200);
  const lines = r.text.split('\n'), root = JSON.parse(lines.find(l => l.startsWith('0:')).slice(2));
  if (typeof root.a === 'string' && root.a.startsWith('$@')) {
    const prefix = root.a.slice(2) + ':', raw = lines.filter(l => l.startsWith(prefix)).at(-1)?.slice(prefix.length);
    assert(raw); return raw === '"$undefined"' ? undefined : JSON.parse(raw);
  }
  return root.a;
}
async function tenant(host, route = '/', data, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(origin + route, { method: data === undefined ? 'GET' : 'POST', headers: { host, origin: `http://${host}`, ...(data === undefined ? {} : { 'content-type': 'application/json' }), ...headers } }, res => {
      let text = ''; res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject); if (data !== undefined) req.write(JSON.stringify(data)); req.end();
  });
}
const site = async () => (await db.query('SELECT * FROM "BusinessWebsite" WHERE "businessId"=$1', [business.id])).rows[0];
try {
  const auth = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'registro-plus-20261028@rc.example.invalid', password: accounts.accounts[0].password }) });
  assert.equal(auth.response.status, 200);
  cookie = auth.response.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
  business = (await db.query('SELECT b.* FROM "Business" b JOIN "User" u ON u.id=b."ownerId" WHERE u.email=$1', ['registro-plus-20261028@rc.example.invalid'])).rows[0];
  original = { site: await site(), depositRequired: business.depositRequired };
  await request('/dashboard/website');
  const require = createRequire(path.join(output, 'browser/package.json'));
  const { chromium } = require('playwright');
  browser = await chromium.launch({ headless: true, executablePath: process.env.AUDIT06_CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-first-run', '--disable-background-networking'] });
  const context = await browser.newContext();
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(u.hostname) || u.hostname.endsWith('.localhost') || ['data:', 'blob:'].includes(u.protocol) ? route.continue() : route.abort();
  });
  await context.addCookies(cookie.split('; ').map(part => ({ name: part.slice(0, part.indexOf('=')), value: part.slice(part.indexOf('=') + 1), url: origin })));
  const changelog = fs.readFileSync('src/config/changelog.ts', 'utf8').match(/version:\s*"([^"]+)"/)[1];
  await context.addCookies([{ name: 'puragenda_changelog_seen', value: changelog, url: origin }]);
  const page = await context.newPage(), publicPage = await context.newPage();
  page.setDefaultNavigationTimeout(90000); publicPage.setDefaultNavigationTimeout(90000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message)); publicPage.on('pageerror', e => errors.push(e.message));
  for (const key of (process.argv.includes('--ritual-only') ? ['ritual'] : ['bella', 'matchday', 'ritual', 'y2k'])) {
    let s = await site();
    const switched = await action('switchWebsiteTemplate', [key, 1, s.revision]);
    assert(!switched?.error, switched?.error);
    s = await site();
    // Exercise the actual editor input and autosave, then publish the saved revision.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.bringToFront();
    const loaded = await page.goto(origin + '/dashboard/website', { waitUntil: 'domcontentloaded' }); assert.equal(loaded.status(), 200);
    const dismiss = page.getByRole('button', { name: /Cerrar novedades|Cerrar anuncio de Sitio Web|Entendido/ }).first();
    if (await dismiss.count() && await dismiss.isVisible()) await dismiss.click();
    const heroTab = page.getByRole('tab', { name: 'Portada', exact: true });
    for (let attempt = 0; attempt < 20 && await heroTab.getAttribute('aria-selected') !== 'true'; attempt++) {
      await heroTab.click(); await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.equal(await heroTab.getAttribute('aria-selected'), 'true', `${key}: interactive editor hydrated`);
    const label = key === 'bella' ? 'Título' : key === 'y2k' ? 'Titular · línea 1' : 'Titular';
    const marker = `Auditoria06 ${key} ${randomUUID().slice(0, 6)}`;
    await page.getByLabel(new RegExp('^' + label)).first().fill(marker);
    await page.waitForFunction(() => !document.querySelector('[role="status"][data-error="true"]'));
    for (let i = 0; i < 40 && (await site()).revision === s.revision; i++) await new Promise(resolve => setTimeout(resolve, 250));
    s = await site();
    check(`${key}: real browser autosave persists input`, JSON.stringify(s.draftConfig).includes(marker));
    const host = `${s.subdomain}.localhost:3128`;
    if (s.status === 'PUBLISHED') check(`${key}: editing keeps the public snapshot`, !(await tenant(host)).text.includes(marker));
    const published = await action('publishWebsite', [s.revision, { ignoreContrast: true }]);
    check(`${key}: validated HTTP publication`, !published?.error);
    if (key === 'ritual') {
      const plain = await browser.newContext({javaScriptEnabled: false}), plainPage = await plain.newPage();
      try {
        await plainPage.goto(`http://${host}/`, {waitUntil:'domcontentloaded'});
        const visible = await plainPage.locator('h1').first().evaluate(heading => { let node = heading; while (node) { if (Number(getComputedStyle(node).opacity) < .1) return false; node = node.parentElement; } return true; });
        await plainPage.screenshot({path:path.join(output,'screenshots','ritual-no-js.png'),fullPage:false});
        check('Ritual editorial content stays visible without JavaScript', visible);
      } finally { await plain.close(); }
    }
    for (const width of [1440, 768, 390]) {
      await publicPage.setViewportSize({ width, height: 1000 });
      await publicPage.bringToFront();
      if (width === 1440) {
        const r = await publicPage.goto(`http://${host}/`, { waitUntil: 'domcontentloaded' }); assert.equal(r.status(), 200);
      }
      await publicPage.evaluate(() => scrollTo(0, 0));
      await publicPage.locator('h1').first().waitFor();
      await publicPage.waitForFunction(() => { let element = document.querySelector('h1'); while (element) { if (Number(getComputedStyle(element).opacity) < 0.1) return false; element = element.parentElement; } return true; }, null, { timeout: 15000 });
      await publicPage.evaluate(() => document.fonts.ready);
      await publicPage.waitForFunction(() => [...document.images].filter(img => { const r = img.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).every(img => img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1500));
      const layout = await publicPage.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, missingAlt: document.querySelectorAll('img:not([alt])').length,
        badAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.getElementById(h.slice(1))) }));
      check(`${key} ${width}px: responsive page and image labels`, layout.scroll <= width + 1 && layout.missingAlt === 0);
      check(`${key} ${width}px: internal navigation targets exist`, layout.badAnchors.length === 0);
      const filename = `${key}-public-${width}.png`; await publicPage.screenshot({ path: path.join(output, 'screenshots', filename), fullPage: false, animations: 'disabled' }); screenshots.push(filename);
      await page.setViewportSize({ width, height: 1000 }); await page.bringToFront(); await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', {name: 'Mi sitio', exact: true}).waitFor({state:'visible'});
      await page.locator('iframe').waitFor({ state: 'attached' });
      const editorWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      check(`${key} ${width}px: responsive editor`, editorWidth <= width + 1);
      const editorFile = `${key}-editor-${width}.png`; await page.screenshot({ path: path.join(output, 'screenshots', editorFile), fullPage: false }); screenshots.push(editorFile);
    }
    await publicPage.getByRole('button', { name: /reserv|agend|momento/i }).first().click();
    check(`${key}: booking control responds without browser exceptions`, errors.length === 0);
    const html = (await tenant(host)).text;
    check(`${key}: public HTML excludes API key and media library`, !html.includes(business.apiKey) && !html.includes('"publicId"'));
    check(`${key}: canonical and structured data present`, html.includes(`https://${s.subdomain}.localhost`) && html.includes('application/ld+json'));
  }
  const s = await site(), host = `${s.subdomain}.localhost:3128`;
  check('Sitemap and robots follow public host', (await tenant(host, '/sitemap.xml')).status === 200 && (await tenant(host, '/robots.txt')).text.includes('Sitemap:'));
  const spoof = await request('/sites/' + host.split(':')[0], { headers: { 'x-puragenda-website-host': host } });
  check('Spoofed internal header cannot expose a tenant on the platform host', spoof.response.status === 404);
  check('Preview booking denied on the server', (await tenant(host, '/api/website/book?preview=1', {})).status === 403);
  check('Untrusted Origin denied', (await tenant(host, '/api/website/book', {}, { origin: 'https://evil.example.org' })).status === 403);
  await db.query('UPDATE "Business" SET "depositRequired"=false WHERE id=$1', [business.id]);
  const service = (await db.query('SELECT id FROM "Service" WHERE "businessId"=$1 AND name=$2', [business.id, 'Consulta integral RC'])).rows[0];
  const location = (await db.query('SELECT id FROM "BusinessLocation" WHERE "businessId"=$1 AND "isPrimary"=true', [business.id])).rows[0];
  const staff = (await db.query('SELECT id FROM "Staff" WHERE "businessId"=$1 AND name=$2', [business.id, 'Profesional Integral RC'])).rows[0];
  let slot, date;
  for (let day = 2; day < 9 && !slot; day++) {
    date = new Date(Date.now() + day * 86400000).toISOString().slice(0, 10);
    const query = new URLSearchParams({ date, serviceId: service.id, locationId: location.id, staffId: staff.id });
    const r = await tenant(host, '/api/website/availability?' + query); assert.equal(r.status, 200); slot = JSON.parse(r.text).slots[0];
  }
  assert(slot, 'Central availability required');
  const input = { serviceId: service.id, locationId: location.id, staffId: staff.id, optionIds: [], date, startTime: slot.startTime, customerName: 'Audit06 Synthetic', customerEmail: `${randomUUID()}@example.invalid`, customerPhone: '+56911111111' };
  const headers = { 'idempotency-key': randomUUID() };
  const booked = await tenant(host, '/api/website/book', input, headers), result = JSON.parse(booked.text);
  const appointment = result.id ? (await db.query('SELECT status FROM "Appointment" WHERE id=$1 AND "businessId"=$2', [result.id, business.id])).rows[0] : null;
  check('Website delegates booking and preserves the central confirmation state', booked.status === 201 && appointment && result.kind === (appointment.status === 'CONFIRMED' ? 'confirmed' : 'pending'));
  const replay = JSON.parse((await tenant(host, '/api/website/book', input, headers)).text);
  check('Network retry reuses the same appointment', replay.id === result.id);
  check('A second operation cannot take the occupied slot', (await tenant(host, '/api/website/book', input, { 'idempotency-key': randomUUID() })).status === 409);
  check('Client price injection is rejected', (await tenant(host, '/api/website/book', { ...input, price: 1 }, headers)).status === 400);
  check('Tenant service injection is rejected', (await tenant(host, '/api/website/book', { ...input, serviceId: 'foreign-service' }, { 'idempotency-key': randomUUID() })).status === 400);
  const custom = `audit06-${randomUUID()}.example.org`;
  domainId = randomUUID();
  await db.query('INSERT INTO "WebsiteDomain" (id,"websiteId",hostname,status,provider,"verificationToken","tenantVerifiedAt","updatedAt") VALUES ($1,$2,$3,\'ACTIVE\',\'pending\',$4,NOW(),NOW())', [domainId, s.id, custom, randomUUID()]);
  check('Custom domain can be made primary through the tenant action', !(await action('setPrimaryWebsiteDomain', [domainId]))?.error);
  check('Primary custom domain drives canonical and sitemap', (await tenant(host)).text.includes(`https://${custom}`) && (await tenant(custom, '/sitemap.xml')).text.includes(`https://${custom}`));
  check('Disconnecting a domain requires no provider write for a local reservation', !(await action('disconnectWebsiteDomain', [domainId]))?.error);
  check('Disconnected domain cannot serve the old tenant', (await tenant(custom)).status === 404); domainId = undefined;
  await action('suspendWebsite', []);
  check('Suspension closes public page, sitemap and booking', (await tenant(host)).status === 404 && (await tenant(host, '/sitemap.xml')).status === 404 && (await tenant(host, '/api/website/book', input, headers)).status === 404);
  check('Suspended robots deny indexing', (await tenant(host, '/robots.txt')).text.includes('Disallow: /'));
  check('Explicit republication restores the saved snapshot', !(await action('publishWebsite', [s.revision, { ignoreContrast: true }]))?.error && (await tenant(host)).status === 200);
  fs.writeFileSync(path.join(output, process.argv.includes('--ritual-only') ? 'ritual-browser-results.json' : 'http-browser-results.json'), JSON.stringify({ passed: true, checks, screenshots, browserErrors: errors, externalProviderCalls: 0 }, null, 2));
} finally {
  if (domainId) await db.query('DELETE FROM "WebsiteDomain" WHERE id=$1', [domainId]);
  if (original) {
    const s = original.site;
    await db.query('UPDATE "Business" SET "depositRequired"=$1 WHERE id=$2', [original.depositRequired, business.id]);
    await db.query('UPDATE "BusinessWebsite" SET "templateKey"=$1,"templateVersion"=$2,"draftConfig"=$3,"templateConfigs"=$4,"publishedConfig"=$5,"publishedTemplateKey"=$6,"publishedTemplateVersion"=$7,"publishedRevision"=$8,"publishedAt"=$9,status=$10,revision=$11 WHERE id=$12', [s.templateKey,s.templateVersion,s.draftConfig,s.templateConfigs,s.publishedConfig,s.publishedTemplateKey,s.publishedTemplateVersion,s.publishedRevision,s.publishedAt,s.status,s.revision,s.id]);
  }
  await browser?.close(); await db.end();
}
