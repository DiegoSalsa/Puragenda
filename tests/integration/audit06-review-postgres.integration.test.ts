import { randomUUID } from 'node:crypto';
import { Children, isValidElement } from 'react';
import type { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const actor = vi.hoisted(() => ({ user: null as { id: string; role: string; tokenVersion: number } | null }));
const cloud = vi.hoisted(() => ({ upload: vi.fn(), destroy: vi.fn() }));
const dns = vi.hoisted(() => ({ txt: vi.fn() }));
vi.mock('@/server/auth/user-session', () => ({ getCurrentSessionUser: async () => actor.user }));
vi.mock('@/server/lib/cloudinary', () => ({ cloudinary: { uploader: cloud } }));
vi.mock('node:dns/promises', () => ({ resolveTxt: dns.txt }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'dashboard.puragenda.cl' }) }));
vi.mock('@/websites/registry', async importOriginal => {
  const original = await importOriginal<typeof import('@/websites/registry')>();
  return { ...original, resolveTemplate: (...args: Parameters<typeof original.resolveTemplate>) => ({
    ...original.resolveTemplate(...args), loadEditor: async () => () => null,
  }) };
});

import { prisma } from '@/server/db/prisma';
import { fixture, businesses, users } from '../fixtures/audit05-billing';
import { canonicalWebsiteUrl, ensureWebsite, resolveWebsiteHost } from '@/server/websites/service';
import { deleteWebsiteAsset } from '@/server/websites/media';
import WebsitePage from '@/app/dashboard/website/page';
import { fixtureView } from '@/websites/fixtures/views';
import { DASHBOARD_PERMISSIONS } from '@/core/permissions';

type Fixture = Awaited<ReturnType<typeof site>>;
async function site(plan: 'PURAGENDA' | 'PURAGENDA_PLUS' = 'PURAGENDA_PLUS') {
  const f = await fixture({ plan, professionalTotal: 1, billingCycle: 'MONTHLY' }, true);
  actor.user = { id: f.user.id, role: f.user.role, tokenVersion: f.user.tokenVersion };
  const website = await ensureWebsite(f.business.id, f.business.slug);
  await prisma.businessWebsite.update({ where: { id: website.id }, data: {
    status: 'PUBLISHED', draftConfig: fixtureView('a').config, publishedConfig: fixtureView('a').config,
    publishedTemplateKey: 'bella', publishedTemplateVersion: 1, publishedAt: new Date(),
  } });
  return { ...f, website };
}
async function image(f: Fixture) {
  return prisma.websiteMedia.create({ data: { websiteId: f.website.id, publicId: `audit06/${randomUUID()}`,
    secureUrl: `https://res.cloudinary.com/audit06/image/upload/${randomUUID()}.webp`,
    width: 32, height: 32, bytes: 100, format: 'webp', usage: 'hero', provider: 'cloudinary' } });
}
async function deleteAfterLock(f: Fixture, id: string, change: (tx: Prisma.TransactionClient) => Promise<unknown>) {
  let deleting!: Promise<{ ok: boolean; error?: unknown }>;
  try { await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${f.business.id} FOR UPDATE`;
    const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    deleting = deleteWebsiteAsset(id).then(() => ({ ok: true }), error => ({ ok: false, error }));
    let waiting = false;
    for (let attempt = 0; attempt < 150 && !waiting; attempt++) {
      const rows = await prisma.$queryRaw<Array<{ waiting: boolean }>>`SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'
        AND ${pid} = ANY(pg_blocking_pids(pid)) AND query LIKE 'SELECT id FROM "Business"%FOR UPDATE'
      ) AS waiting`;
      waiting = rows[0].waiting;
      if (!waiting) await new Promise(resolve => setTimeout(resolve, 20));
    }
    expect(waiting, 'deletion must actually be blocked behind this Business transaction').toBe(true);
    await change(tx);
  }, { timeout: 15000 }); }
  finally { if (deleting) await deleting; }
  return deleting;
}
function editorProps(node: unknown): Record<string, unknown> | undefined {
  let found: Record<string, unknown> | undefined;
  Children.forEach(node as React.ReactNode, child => {
    if (!isValidElement<Record<string, unknown>>(child)) return;
    if (typeof child.props.publicUrl === 'string' && child.props.templateKey) found = child.props;
    else found ??= editorProps(child.props.children);
  });
  return found;
}

describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL)('Audit 06 independent review on real PostgreSQL', () => {
  beforeEach(() => { vi.clearAllMocks(); dns.txt.mockReset(); vi.stubEnv('WEBSITE_ROOT_DOMAIN', 'puragenda.cl'); cloud.destroy.mockResolvedValue({ result: 'ok' }); });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await prisma.business.deleteMany({ where: { id: { in: businesses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it.each(['downgrade', 'suspension', 'expiry'] as const)('06-A reproduction: rejects deletion after concurrent %s, then permits recovery', async reason => {
    const f = await site(), asset = await image(f);
    const result = await deleteAfterLock(f, asset.id, tx => tx.commercialSubscription.update({ where: { id: f.sub.id }, data:
      reason === 'downgrade' ? { planCode: 'PURAGENDA' } : reason === 'suspension' ? { status: 'PAST_DUE_BLOCKED' } : { trialStart: new Date(Date.now() - 86400000), trialEnd: new Date(Date.now() - 1000) },
    }));
    expect(result.ok).toBe(false);
    expect((await prisma.websiteMedia.findUniqueOrThrow({ where: { id: asset.id } })).deletedAt).toBeNull();
    expect(cloud.destroy).not.toHaveBeenCalled();
    await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: 'PURAGENDA_PLUS', status: 'ACTIVE', periodStart: new Date(Date.now() - 3600000), periodEnd: new Date(Date.now() + 86400000), lastPaymentStatus: 'CONFIRMED', lastPaymentAt: new Date(), lastPaymentEventId: 'synthetic-recovery-evidence' } });
    await deleteWebsiteAsset(asset.id);
    expect(cloud.destroy).toHaveBeenCalledExactlyOnceWith(asset.publicId, { invalidate: true });
  }, 20000);
  it('06-A preserves paid independent legacy maintenance after a V2 base downgrade', async () => {
    const f = await site(), asset = await image(f);
    await prisma.websiteAddon.create({ data: { businessId: f.business.id, status: 'ACTIVE', provider: 'mercadopago', cancelAt: new Date(Date.now() + 86400000), validUntil: new Date(Date.now() + 86400000) } });
    const result = await deleteAfterLock(f, asset.id, tx => tx.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: 'PURAGENDA' } }));
    expect(result.ok).toBe(true);
    expect(cloud.destroy).toHaveBeenCalledExactlyOnceWith(asset.publicId, { invalidate: true });
  }, 20000);
  it('06-A rejects a staff member without WEBSITE_MANAGE before any provider call', async () => {
    const f = await site(), asset = await image(f);
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, password: 'synthetic', name: 'Restricted QA', role: 'STAFF' } });
    users.push(user.id);
    await prisma.staff.create({ data: { businessId: f.business.id, userId: user.id, name: 'Restricted QA' } });
    actor.user = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
    await expect(deleteWebsiteAsset(asset.id)).rejects.toThrow('autorizado');
    expect(cloud.destroy).not.toHaveBeenCalled();
    expect((await prisma.websiteMedia.findUniqueOrThrow({ where: { id: asset.id } })).deletedAt).toBeNull();
  });
  it('06-A reproduction: rechecks a permission revoked while waiting for the Business lock', async () => {
    const f = await site(), asset = await image(f);
    const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.invalid`, password: 'synthetic', name: 'Manager QA', role: 'STAFF' } });
    users.push(user.id);
    const profile = await prisma.accessProfile.create({ data: { businessId: f.business.id, name: 'Website QA', permissions: [DASHBOARD_PERMISSIONS.WEBSITE_MANAGE] } });
    await prisma.staff.create({ data: { businessId: f.business.id, userId: user.id, name: 'Manager QA', accessProfileId: profile.id } });
    actor.user = { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
    const result = await deleteAfterLock(f, asset.id, tx => tx.accessProfile.update({ where: { id: profile.id }, data: { permissions: [] } }));
    expect(result.ok).toBe(false);
    expect(cloud.destroy).not.toHaveBeenCalled();
    expect((await prisma.websiteMedia.findUniqueOrThrow({ where: { id: asset.id } })).deletedAt).toBeNull();
  }, 20000);
  it('06-A rejects a session revoked while blocked, without touching Cloudinary', async () => {
    const f = await site(), asset = await image(f);
    const result = await deleteAfterLock(f, asset.id, tx => tx.user.update({ where: { id: f.user.id }, data: { tokenVersion: { increment: 1 } } }));
    expect(result.ok).toBe(false);
    expect(cloud.destroy).not.toHaveBeenCalled();
    expect((await prisma.websiteMedia.findUniqueOrThrow({ where: { id: asset.id } })).deletedAt).toBeNull();
  }, 20000);
  it('06-B reproduction: the editor falls back when its expired primary TXT is invalid', async () => {
    const f = await site(), hostname = `${randomUUID()}.example.org`;
    await prisma.websiteDomain.create({ data: { websiteId: f.website.id, hostname, status: 'ACTIVE', isPrimary: true,
      verificationToken: 'synthetic-current-token', tenantVerifiedAt: new Date(Date.now() - 25 * 3600000) } });
    dns.txt.mockResolvedValue([['synthetic-wrong-token']]);
    expect(await resolveWebsiteHost(hostname)).toBeNull();
    expect(editorProps(await WebsitePage())?.publicUrl).toBe(`https://${f.website.subdomain}.puragenda.cl`);
  });
  it.each(['valid', 'invalid', 'absent', 'failure'] as const)('06-B uses one shared expired-primary DNS decision for %s TXT in the editor', async state => {
    const f = await site(), hostname = `${randomUUID()}.example.org`;
    const d = await prisma.websiteDomain.create({ data: { websiteId: f.website.id, hostname, status: 'ACTIVE', isPrimary: true,
      verificationToken: 'synthetic-current-token', tenantVerifiedAt: new Date(Date.now() - 25 * 3600000) } });
    if (state === 'failure') dns.txt.mockRejectedValue(new Error('Controlled DNS outage'));
    else dns.txt.mockResolvedValue(state === 'valid' ? [['synthetic-', 'current-token']] : state === 'invalid' ? [['other-tenant-token']] : []);
    const props = editorProps(await WebsitePage());
    expect(props?.publicUrl).toBe(state === 'valid' ? `https://${hostname}` : `https://${f.website.subdomain}.puragenda.cl`);
    expect(props?.domains).toEqual(expect.arrayContaining([expect.objectContaining({ id: d.id, status: state === 'valid' ? 'ACTIVE' : 'OWNERSHIP_REVIEW' })]));
    expect(dns.txt).toHaveBeenCalledExactlyOnceWith(`_puragenda.${hostname}`);
    const resolved = await resolveWebsiteHost(hostname);
    expect(!!resolved).toBe(state === 'valid');
    // Rendering must not change reservations, selected ownership or proof age.
    expect(await prisma.websiteDomain.findUniqueOrThrow({ where: { id: d.id } })).toEqual(d);
  });
  it('06-B trusts a fresh bounded primary proof and does not query DNS', async () => {
    const f = await site(), hostname = `${randomUUID()}.example.org`;
    await prisma.websiteDomain.create({ data: { websiteId: f.website.id, hostname, status: 'ACTIVE', isPrimary: true,
      verificationToken: 'fresh-proof-token', tenantVerifiedAt: new Date(Date.now() - 3600000) } });
    expect(editorProps(await WebsitePage())?.publicUrl).toBe(`https://${hostname}`);
    expect(await resolveWebsiteHost(hostname)).not.toBeNull();
    expect(dns.txt).not.toHaveBeenCalled();
  });
  it('06-B keeps its own subdomain and SEO valid without promoting a secondary domain', async () => {
    const f = await site(), primary = `${randomUUID()}.example.org`, secondary = `${randomUUID()}.example.org`;
    await prisma.websiteDomain.create({ data: { websiteId: f.website.id, hostname: primary, status: 'ACTIVE', isPrimary: true,
      verificationToken: 'expired-proof', tenantVerifiedAt: new Date(Date.now() - 25 * 3600000) } });
    await prisma.websiteDomain.create({ data: { websiteId: f.website.id, hostname: secondary, status: 'ACTIVE', isPrimary: false,
      verificationToken: 'fresh-proof', tenantVerifiedAt: new Date() } });
    dns.txt.mockResolvedValue([]);
    const url = `https://${f.website.subdomain}.puragenda.cl`;
    expect(editorProps(await WebsitePage())?.publicUrl).toBe(url);
    expect(await resolveWebsiteHost(primary)).toBeNull();
    expect(canonicalWebsiteUrl((await resolveWebsiteHost(secondary))!)).toBe(url);
    expect(canonicalWebsiteUrl((await resolveWebsiteHost(`${f.website.subdomain}.puragenda.cl`))!)).toBe(url);
  });
  it('06-B keeps a valid secondary domain secondary when no primary was selected', async () => {
    const f = await site(), hostname = `${randomUUID()}.example.org`;
    await prisma.websiteDomain.create({ data: { websiteId: f.website.id, hostname, status: 'ACTIVE', isPrimary: false,
      verificationToken: 'valid-secondary-proof', tenantVerifiedAt: new Date() } });
    expect(editorProps(await WebsitePage())?.publicUrl).toBe(`https://${f.website.subdomain}.puragenda.cl`);
    expect(await resolveWebsiteHost(hostname)).not.toBeNull();
    expect(dns.txt).not.toHaveBeenCalled();
  });
});
