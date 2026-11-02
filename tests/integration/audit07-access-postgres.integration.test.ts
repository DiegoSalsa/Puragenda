import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
vi.mock('@/server/mcp/rollout', () => ({ requireMcpAccess: async () => undefined, mcpBusinessFilter: async () => ({}) }));
import { prisma } from '@/server/db/prisma';
import { fixture, businesses, users } from '../fixtures/audit05-billing';
import { createPuriContext } from '@/server/puri/context';
import { executePuriTool } from '@/server/puri/tools';
import { membership } from '@/server/mcp/access';
import { publicBusiness } from '@/server/mcp/public';
import { DASHBOARD_PERMISSIONS as P } from '@/core/permissions';
import { createGrowthScope } from '@/server/puri/growth/access';
import type { PuriContext } from '@/server/puri/types';

async function account() {
  const f = await fixture({ plan: 'PURAGENDA_PLUS', professionalTotal: 2, billingCycle: 'MONTHLY' }, true);
  const primary = await prisma.businessLocation.create({ data: { businessId: f.business.id, slug: 'primary', name: 'Primary QA', isPrimary: true, isActive: true, timezone: 'America/Santiago' } });
  const other = await prisma.businessLocation.create({ data: { businessId: f.business.id, slug: 'other', name: 'Restricted QA', isActive: true, timezone: 'America/Santiago' } });
  const member = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, name: 'Limited QA', password: 'synthetic', role: 'STAFF' } });
  users.push(member.id);
  const profile = await prisma.accessProfile.create({ data: { businessId: f.business.id, name: 'QA restricted', permissions: [P.APPOINTMENTS_VIEW_ALL, P.CLIENTS_MANAGE, P.ANALYTICS_VIEW_BUSINESS] } });
  const staff = await prisma.staff.create({ data: { businessId: f.business.id, userId: member.id, name: 'Staff QA', accessProfileId: profile.id } });
  await prisma.staffLocation.create({ data: { staffId: staff.id, locationId: primary.id } });
  const client = await prisma.client.create({ data: { businessId: f.business.id, name: 'Private cross-branch customer', email: 'private-branch@example.invalid' } });
  return { ...f, primary, other, member, profile, staff, client };
}
const input = { pathname: '/dashboard', locale: 'es' };
describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL)('Audit 07 real authorization boundaries', () => {
  afterAll(async () => {
    await prisma.business.deleteMany({ where: { id: { in: businesses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it('rejects a staff-selected branch outside assigned locations despite view_all', async () => {
    const f = await account();
    await expect(createPuriContext(f.member, { ...input, locationSlug: f.other.slug })).rejects.toThrow('LOCATION_FORBIDDEN');
  });
  it('does not expose business-wide CRM to branch-restricted staff', async () => {
    const f = await account(), context = await createPuriContext(f.member, { ...input, locationSlug: f.primary.slug });
    await expect(executePuriTool('searchClients', { query: 'Private' }, context)).rejects.toThrow('FORBIDDEN');
  });
  it('rechecks permissions before each direct tool call', async () => {
    const f = await account(), context = await createPuriContext(f.member, { ...input, locationSlug: f.primary.slug });
    await prisma.accessProfile.update({ where: { id: f.profile.id }, data: { permissions: [] } });
    await expect(executePuriTool('getAppointments', { period: 'today' }, context)).rejects.toThrow('FORBIDDEN');
  });
  it('rechecks revoked session versions before exposing a tool result', async () => {
    const f = await account(), context = await createPuriContext(f.user, input);
    await prisma.user.update({ where: { id: f.user.id }, data: { tokenVersion: { increment: 1 } } });
    await expect(executePuriTool('searchClients', { query: 'Private' }, context)).rejects.toThrow('FORBIDDEN');
  });
  it('rejects stale ownership instead of retaining the former tenant context', async () => {
    const f = await account(), next = await account(), context = await createPuriContext(f.user, input);
    await prisma.business.update({ where: { id: f.business.id }, data: { ownerId: next.user.id } });
    await expect(executePuriTool('searchClients', { query: 'Private' }, context)).rejects.toThrow();
  });
  it('denies expired legacy Puri before any model budget is reached', async () => {
    const f = await account();
    await prisma.commercialSubscription.update({ where: { businessId: f.business.id }, data: { planCode: 'INDIVIDUAL' } });
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { plan: 'INDIVIDUAL', status: 'CANCELLED', currentPeriodEnd: new Date(Date.now() - 86400000) } });
    await expect(createPuriContext(f.user, input)).rejects.toThrow('FORBIDDEN');
  });
  it('MCP rejects an unpaid V2 contract even if its legacy projection looks active', async () => {
    const f = await account();
    await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { status: 'ACTIVE', periodStart: new Date(Date.now() - 86400000), periodEnd: new Date(Date.now() + 86400000), lastPaymentStatus: null, lastPaymentEventId: null } });
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { status: 'ACTIVE', isTrial: false, currentPeriodEnd: new Date(Date.now() + 86400000) } });
    await expect(membership(f.user.id, f.business.id, f.user.tokenVersion)).rejects.toThrow('SUBSCRIPTION_INACTIVE');
  });
  it('MCP honors a valid V2 trial despite a stale inactive legacy projection', async () => {
    const f = await account();
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { status: 'CANCELLED', isTrial: false, currentPeriodEnd: new Date(Date.now() - 86400000) } });
    expect((await membership(f.user.id, f.business.id, f.user.tokenVersion)).business.id).toBe(f.business.id);
  });
  it('denies an employee with no assigned active branch instead of using a global scope', async () => {
    const f = await account();
    await prisma.staffLocation.updateMany({ where: { staffId: f.staff.id }, data: { isActive: false } });
    await expect(createPuriContext(f.member, input)).rejects.toThrow('LOCATION_FORBIDDEN');
  });
  it('public MCP rejects an unpaid V2 business despite an active legacy projection', async () => {
    const f = await account();
    await prisma.business.update({ where: { id: f.business.id }, data: { mcpPublicDiscovery: true } });
    await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { status: 'PAST_DUE_BLOCKED' } });
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { status: 'ACTIVE', isTrial: false, currentPeriodEnd: new Date(Date.now() + 86400000) } });
    await expect(publicBusiness(f.business.slug)).rejects.toThrow('BUSINESS_NOT_FOUND');
  });
  it('never resolves a foreign client ID and preserves legitimate owner access', async () => {
    const a = await account(), b = await account(), context = await createPuriContext(a.user, input);
    await expect(executePuriTool('getClientSummary', { clientId: b.client.id }, context)).rejects.toThrow('CLIENT_NOT_FOUND');
    expect(await executePuriTool('getClientSummary', { clientId: a.client.id }, context)).toMatchObject({ id: a.client.id });
    expect(await executePuriTool('getAppointments', { period: 'today' }, await createPuriContext(a.member, input))).toMatchObject({ appointments: [] });
  });
  it.each([
    ['trial_basic', true, false], ['trial_plus', true, true], ['paid_basic', true, false], ['paid_plus', true, true],
    ['authorized_unpaid', false, false], ['pending', false, false], ['grace', true, true], ['grace_expired', false, false],
    ['blocked', false, false], ['expired', false, false], ['cancelled_renewal_paid', true, true], ['expired_trial', false, false],
    ['upgrade', true, true], ['downgrade', true, false], ['legacy_active', true, false],
  ] as const)('effective Puri/Plus grant: %s', async (state, standard, plus) => {
    const f = await account(), now = new Date();
    const old = await createPuriContext(f.user, input);
    if (state === 'trial_basic' || state === 'downgrade') await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: 'PURAGENDA' } });
    if (state === 'upgrade') {
      await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: 'PURAGENDA' } });
      await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: 'PURAGENDA_PLUS' } });
    }
    if (['paid_basic', 'paid_plus', 'grace', 'grace_expired', 'cancelled_renewal_paid', 'expired', 'blocked', 'authorized_unpaid'].includes(state)) {
      await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: {
        planCode: state === 'paid_basic' ? 'PURAGENDA' : 'PURAGENDA_PLUS', status: state === 'blocked' ? 'PAST_DUE_BLOCKED' : 'ACTIVE',
        trialStart: null, trialEnd: null, periodStart: new Date(+now - 40 * 86400000),
        periodEnd: new Date(+now + (['grace', 'grace_expired', 'expired'].includes(state) ? state === 'grace' ? -3600000 : -49 * 3600000 : 86400000)),
        lastPaymentStatus: state === 'authorized_unpaid' ? null : 'CONFIRMED', lastPaymentAt: new Date(+now - 10 * 86400000), lastPaymentEventId: state === 'authorized_unpaid' ? null : randomUUID(),
        ...(['grace', 'grace_expired'].includes(state) ? { provider: 'MERCADO_PAGO', externalSubscriptionId: randomUUID() } : {}),
        ...(state === 'cancelled_renewal_paid' ? { renewalCancellationStatus: 'CANCELLED_VERIFIED', renewalCancelledAt: now } : {}),
      } });
    }
    if (state === 'pending') await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { status: 'PENDING_PAYMENT' } });
    if (state === 'expired_trial') await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { trialStart: new Date(+now - 40 * 86400000), trialEnd: new Date(+now - 86400000) } });
    if (state === 'legacy_active') {
      await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: 'INDIVIDUAL' } });
      await prisma.subscription.update({ where: { businessId: f.business.id }, data: { plan: 'INDIVIDUAL', status: 'ACTIVE', isTrial: false, currentPeriodEnd: new Date(+now + 86400000) } });
    }
    const current = createPuriContext(f.user, input);
    if (standard) {
      const context = await current;
      expect(await executePuriTool('getAppointments', { period: 'today' }, context)).toMatchObject({ appointments: [] });
      vi.stubEnv('COMMERCIAL_V2_INTERNAL_WRITES', '1'); vi.stubEnv('PURI_PLUS_INTERNAL_ENABLED', '1');
      try { if (plus) await expect(createGrowthScope(context)).resolves.toMatchObject({ businessId: f.business.id }); else await expect(createGrowthScope(context)).rejects.toThrow('PLUS_ENTITLEMENT_REQUIRED'); }
      finally { vi.unstubAllEnvs(); }
    } else {
      await expect(current).rejects.toThrow('FORBIDDEN');
      await expect(executePuriTool('getAppointments', { period: 'today' }, old)).rejects.toThrow('FORBIDDEN');
    }
  });
  it.each(['deleted_user', 'deleted_business', 'inactive_staff'] as const)('revokes a captured context for %s', async state => {
    const f = await account(), context = await createPuriContext(state === 'inactive_staff' ? f.member : f.user, input);
    if (state === 'deleted_user') await prisma.user.update({ where: { id: f.user.id }, data: { deletedAt: new Date() } });
    if (state === 'deleted_business') await prisma.business.update({ where: { id: f.business.id }, data: { deletedAt: new Date() } });
    if (state === 'inactive_staff') await prisma.staff.update({ where: { id: f.staff.id }, data: { isActive: false } });
    await expect(executePuriTool('getAppointments', { period: 'today' }, context)).rejects.toThrow();
  });
  it('does not return data if a real query finishes after session revocation', async () => {
    const f = await account(), context: PuriContext = await createPuriContext(f.user, input);
    const find = prisma.client.findMany.bind(prisma.client);
    const read = async (args: Parameters<typeof find>[0]) => { const rows = await find(args); await prisma.user.update({ where: { id: f.user.id }, data: { tokenVersion: { increment: 1 } } }); return rows; };
    const spy = vi.spyOn(prisma.client, 'findMany').mockImplementationOnce(read as unknown as typeof prisma.client.findMany);
    try { await expect(executePuriTool('searchClients', { query: 'Private' }, context)).rejects.toThrow('FORBIDDEN'); }
    finally { spy.mockRestore(); }
  });
});
