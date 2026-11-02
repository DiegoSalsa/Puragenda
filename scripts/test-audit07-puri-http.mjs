import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { localCommercialDatabase } from './commercial-migrations.mjs';
const state = JSON.parse(fs.readFileSync('scratch/next-staging/current.json', 'utf8'));
const target = path.resolve(state.target);
assert(target.startsWith(path.resolve('scratch/next-staging') + path.sep));
const env = JSON.parse(fs.readFileSync(path.join(target, 'staging-runtime.private.json'), 'utf8'));
const accounts = JSON.parse(fs.readFileSync(path.join(target, 'staging-accounts.private.json'), 'utf8'));
assert(accounts.synthetic); assert.equal(state.httpOrigin, 'http://127.0.0.1:3128'); assert.equal(env.PURI_PLUS_AI_ENABLED, '0');
assert(!env.OPENAI_API_KEY); assert.equal(env.NEXT_STAGING_NETWORK_GUARD, '1');
const pool = new pg.Pool({ connectionString: localCommercialDatabase(env.DATABASE_URL) });
const checks = [], root = '/api/dashboard/puri';
async function call(route, data, cookie = '', headers = {}) {
  const response = await fetch(state.httpOrigin + route, { method: 'POST', headers: { Origin: state.httpOrigin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: JSON.stringify(data) });
  return { response, body: await response.json() };
}
function ok(name, value) { assert(value, name); checks.push(name); console.log('PASS ' + name); }
async function login(account) {
  const r = await call('/api/auth/login', { email: account.email, password: account.password }); assert.equal(r.response.status, 200);
  return r.response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
try {
  const basic = accounts.accounts.find(a => a.plan === 'PURAGENDA'), plus = accounts.accounts.find(a => a.plan === 'PURAGENDA_PLUS');
  const b = await login(basic), p = await login(plus);
  ok('Puri requires an actual authenticated HTTP session', (await call(root, { message: 'Hoy' })).response.status === 401);
  ok('Puri rejects cross-origin requests', (await call(root, { message: 'Hoy' }, b, { Origin: 'https://untrusted.example.invalid' })).response.status === 403);
  ok('Puri bounds unknown fields in a body without Content-Length', (await call(root, { message: 'Hoy', padding: 'x'.repeat(64001) }, b)).response.status === 400);
  const missing = await call(root, { message: 'Hoy' }, b);
  ok('Unconfigured AI fails safely while ordinary modules remain available', missing.response.status === 503 && missing.body.code === 'NOT_CONFIGURED');
  ok('Read-only guidance for unsupported writes does not need a provider', (await call(root, { message: 'Cancela mi reserva' }, b)).body.answer?.toolsUsed.length === 0);
  const event = { event: 'opened', sessionId: randomUUID() };
  ok('Optional Puri event accepts only current tenant context', (await call(root + '/events', event, b)).response.status === 202);
  const foreign = (await pool.query('SELECT slug FROM "BusinessLocation" WHERE "businessId"=$1 LIMIT 1', [plus.businessId])).rows[0].slug;
  ok('Puri event cannot select another tenant branch', (await call(root + '/events', { ...event, locationSlug: foreign + '-foreign' }, b)).response.status === 403);
  const owner = (await pool.query('SELECT "ownerId" FROM "Business" WHERE id=$1', [plus.businessId])).rows[0].ownerId, id = randomUUID();
  await pool.query('INSERT INTO "PuriRequest" (id,"sessionId","businessId","userId",role,status) VALUES ($1,$2,$3,$4,$5,$6)', [id, randomUUID(), plus.businessId, owner, 'ADMIN', 'SUCCESS']);
  ok('Feedback cannot address a different user response', (await call(root + '/feedback', { responseId: id, rating: 'positive' }, b)).response.status === 404);
  ok('Feedback from its owner uses the real response record', (await call(root + '/feedback', { responseId: id, rating: 'positive' }, p)).response.status === 200);
  const denied = await call('/api/dashboard/puri-plus', { action: 'LOAD' }, b);
  ok('Basic trial cannot use Plus via the internal API', denied.response.status >= 400 && !denied.body.result);
  const allowed = await call('/api/dashboard/puri-plus', { action: 'LOAD' }, p);
  ok('Plus trial can load its scoped aggregate workspace', allowed.response.status === 200 && allowed.body.capabilities.tier.startsWith('PURI_PLUS'));
  const chat = await call('/api/dashboard/puri-plus', { action: 'CHAT', message: 'Analiza ingresos sin enviar campañas' }, p);
  ok('Plus has a deterministic nonfatal fallback without AI', chat.response.status === 200 && chat.body.result.fallback === true && !!chat.body.result.answer.message);
  ok('Dashboard omits internal budget costs and identities from the fallback', !('costMicros' in chat.body.result) && !('costKnown' in chat.body.result) && !JSON.stringify(chat.body.result.answer).includes('@'));
  const logs = await pool.query('SELECT "intent","model","estimatedCostUsd" FROM "PuriRequest" WHERE "businessId"=$1 ORDER BY "createdAt" DESC LIMIT 5', [basic.businessId]);
  ok('Standard telemetry contains metadata and unknown costs stay unknown', logs.rows.some(r => r.estimatedCostUsd === null));
  fs.writeFileSync(path.resolve('scratch/audit07/puri-http-results.json'), JSON.stringify({ passed:true, syntheticOnly:true, aiProviderCalls:0, checks }, null, 2));
} finally { await pool.end(); }
