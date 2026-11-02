import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const actor = vi.hoisted(() => ({ user: null as { id: string; role: string; tokenVersion: number } | null }));
vi.mock('@/server/auth/user-session', () => ({ getApiSessionUser: async () => actor.user }));
import { prisma } from '@/server/db/prisma';
import { growthFixture, deleteGrowthFixture } from '../fixtures/puri-growth';
import { createGrowthScope, revalidateGrowthScope } from '@/server/puri/growth/access';
import { answerWithGrowthPuri, createGrowthExtension } from '@/server/puri/growth/runtime';
import { configureGrowthBudget, reserveGrowthUsage, settleGrowthUsage } from '@/server/puri/growth/budgets';
import { withCommercialPuriUsage } from '@/server/puri/commercial-usage';
import { analyzeGrowth } from '@/server/puri/growth/analysis';
import { draftGrowthRecommendation, prepareGrowthStrategy } from '@/server/puri/growth/recommendations';
import { growthPlatformMetrics } from '@/server/puri/growth/monitoring';
import { POST } from '@/server/puri/growth/http';
const fixtures: Awaited<ReturnType<typeof growthFixture>>[] = [];
async function fixture() { const f = await growthFixture(); fixtures.push(f); return f; }
const params = { model: 'gpt-6-luna', input: 'Synthetic QA', max_output_tokens: 1200 };
describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL)('Audit 07 isolated runtime and ledger', () => {
  beforeEach(() => {
    vi.stubEnv('COMMERCIAL_V2_INTERNAL_WRITES', '1');
    vi.stubEnv('PURI_PLUS_INTERNAL_ENABLED', '1');
    vi.stubEnv('PURI_PLUS_AI_ENABLED', '1');
    vi.stubEnv('PURI_MODEL_PRICES_USD_PER_MILLION', JSON.stringify({ 'gpt-6-luna': { input: 1, output: 1, cachedInput: 1 } }));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
  afterAll(async () => { for (const f of fixtures) await deleteGrowthFixture(f); await prisma.$disconnect(); });
  it('revokes a captured Growth session version before reusing its scope', async () => {
    const f = await fixture();
    await prisma.user.update({ where: { id: f.user.id }, data: { tokenVersion: { increment: 1 } } });
    await expect(revalidateGrowthScope(f.scope)).rejects.toThrow();
    await expect(createGrowthScope(f.context)).rejects.toThrow();
  });
  it('keeps deterministic Growth available when optional request telemetry fails', async () => {
    const f = await fixture(); vi.stubEnv('PURI_PLUS_AI_ENABLED', '0');
    vi.spyOn(prisma.puriRequest, 'create').mockRejectedValue(new Error('PRIVATE_DATABASE_DETAIL'));
    const result = await answerWithGrowthPuri(f.context, f.scope, 'Analiza');
    expect(result.fallback).toBe(true); expect(result.answer.message).not.toContain('PRIVATE_DATABASE_DETAIL');
  });
  it.each(['STANDARD_INTERACTIVE', 'PLUS_INTERACTIVE'] as const)('rechecks %s authorization after a real PostgreSQL budget lock wait', async category => {
    const f = await fixture();
    if (category === 'STANDARD_INTERACTIVE') await configureGrowthBudget({ businessId: f.businessId, category, limitMicros: 100000, limitUnits: 100 });
    const blocker = new pg.Client({ connectionString: process.env.COMMERCIAL_V2_TEST_DATABASE_URL });
    const observer = new pg.Client({ connectionString: process.env.COMMERCIAL_V2_TEST_DATABASE_URL });
    await blocker.connect(); await observer.connect();
    const transport = vi.fn(async () => ({ service_tier: 'default', model: 'gpt-6-luna', usage: { input_tokens: 1, output_tokens: 1, input_tokens_details: { cached_tokens: 0 } }, output: [] }));
    let operation: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN'); const pid = (await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await blocker.query('SELECT pg_advisory_xact_lock(726841901)');
      operation = category === 'STANDARD_INTERACTIVE'
        ? withCommercialPuriUsage({ businessId: f.businessId, model: 'gpt-6-luna', parameters: params, maxRetries: 0, run: transport })
        : createGrowthExtension(f.scope, { transport }).createResponse(params);
      const outcome = operation.then(value => ({ value }), error => ({ error }));
      let waiting = false;
      for (let attempt = 0; attempt < 150; attempt++) {
        const result = await observer.query('SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))', [pid]);
        if (result.rowCount) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await blocker.query('UPDATE "CommercialSubscription" SET status = $1 WHERE "businessId" = $2', ['PAST_DUE_BLOCKED', f.businessId]);
      await blocker.query('COMMIT');
      const result = await outcome;
      expect('error' in result).toBe(true); expect(transport).not.toHaveBeenCalled();
      const reservation = await prisma.puriUsageReservation.findFirstOrThrow({ where: { businessId: f.businessId, category } });
      expect(reservation).toMatchObject({ state: 'SETTLED', actualMicros: 0 });
    } finally { await blocker.query('ROLLBACK'); await operation?.catch(() => undefined); await blocker.end(); await observer.end(); }
  });
  it('caps ten concurrent reservations atomically and settles each only once', async () => {
    const f = await fixture();
    await configureGrowthBudget({ businessId: f.businessId, category: 'PLUS_INTERACTIVE', limitMicros: 30, limitUnits: 3 });
    const attempts = await Promise.allSettled(Array.from({ length: 10 }, () => reserveGrowthUsage({ businessId: f.businessId, category: 'PLUS_INTERACTIVE', key: randomUUID(), inputHash: 'synthetic', micros: 10 })));
    const allowed = attempts.flatMap(r => r.status === 'fulfilled' ? [r.value] : []);
    expect(allowed).toHaveLength(3);
    await Promise.all(allowed.flatMap(r => [settleGrowthUsage(r.reservation.id, { actualMicros: 5 }), settleGrowthUsage(r.reservation.id, { actualMicros: 5 })]));
    const bucket = await prisma.puriBudgetBucket.findFirstOrThrow({ where: { businessId: f.businessId, category: 'PLUS_INTERACTIVE' } });
    expect(bucket).toMatchObject({ reservedMicros: 0, reservedUnits: 0, spentMicros: 15, spentUnits: 3 });
  });
  it('denies preparing a proposal after Plus is revoked while waiting for its scope lock', async () => {
    const f = await fixture(), analysis = await analyzeGrowth(f.scope);
    const rec = await draftGrowthRecommendation(f.scope, analysis.signals[0].id);
    const blocker = new pg.Client({ connectionString: process.env.COMMERCIAL_V2_TEST_DATABASE_URL }), observer = new pg.Client({ connectionString: process.env.COMMERCIAL_V2_TEST_DATABASE_URL });
    await blocker.connect(); await observer.connect(); let operation: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN'); const pid = (await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      await blocker.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [f.businessId + ':' + f.scope.scopeKey]);
      operation = prepareGrowthStrategy(f.scope, rec.id, rec.contentHash, rec.version);
      const outcome = operation.then(value => ({ value }), error => ({ error }));
      let waiting = false;
      for (let i = 0; i < 150; i++) {
        if ((await observer.query('SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))', [pid])).rowCount) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await blocker.query('UPDATE "CommercialSubscription" SET "planCode" = $1 WHERE "businessId" = $2', ['PURAGENDA', f.businessId]); await blocker.query('COMMIT');
      expect('error' in await outcome).toBe(true);
      expect(await prisma.puriGrowthRecommendation.findUniqueOrThrow({ where: { id: rec.id } })).toMatchObject({ status: 'DRAFT' });
    } finally { await blocker.query('ROLLBACK'); await operation?.catch(() => undefined); await blocker.end(); await observer.end(); }
  });
  it('counts legitimately paid Plus during worker-independent 48 hour grace in Superadmin', async () => {
    const f = await fixture(); await prisma.user.update({ where: { id: f.user.id }, data: { isSuperAdmin: true } });
    const before = await growthPlatformMetrics(f.user.id);
    await prisma.commercialSubscription.update({ where: { businessId: f.businessId }, data: { provider: 'MERCADO_PAGO', externalSubscriptionId: randomUUID(), legacySubscriptionId: null, termsSnapshot: { origin: 'registration_v2' }, periodEnd: new Date(Date.now() - 60000) } });
    const after = await growthPlatformMetrics(f.user.id);
    expect(after.eligiblePaidSubscriptions).toBe(before.eligiblePaidSubscriptions);
  });
  it('does not return a Plus HTTP aggregate after its final read revokes the session', async () => {
    const f = await fixture(); actor.user = f.user;
    const find = prisma.puriGrowthRecommendation.findMany.bind(prisma.puriGrowthRecommendation);
    const read = async (args: Parameters<typeof find>[0]) => { const rows = await find(args); await prisma.user.update({ where: { id: f.user.id }, data: { tokenVersion: { increment: 1 } } }); return rows; };
    vi.spyOn(prisma.puriGrowthRecommendation, 'findMany').mockImplementationOnce(read as unknown as typeof prisma.puriGrowthRecommendation.findMany);
    const response = await POST(new NextRequest('http://localhost/api/dashboard/puri-plus', { method: 'POST', headers: { Origin: 'http://localhost', 'Content-Type': 'application/json' }, body: '{"action":"LOAD"}' }));
    expect(response.status).toBeGreaterThanOrEqual(400); expect(await response.json()).not.toHaveProperty('recommendations');
  });
});
