import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { afterAll, describe, expect, it, vi } from 'vitest';
const actor = vi.hoisted(() => ({ user: null as { id: string; role: string } | null }));
vi.mock('@/server/auth/user-session', () => ({ getCurrentSessionUser: async () => actor.user }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const cloud = vi.hoisted(() => ({ upload: vi.fn(), destroy: vi.fn() }));
const dns = vi.hoisted(() => ({ txt: vi.fn() }));
vi.mock('node:dns/promises', () => ({ resolveTxt: dns.txt }));
vi.mock('@/server/lib/cloudinary', () => ({ cloudinary: { uploader: cloud } }));
import { prisma } from '@/server/db/prisma';
import { fixture, businesses, users } from '../fixtures/audit05-billing';
import { resolveWebsiteCommercialAccess } from '@/server/websites/commercial-access';
import { ensureWebsite, requireWebsiteManager, resolveWebsiteHost, websiteView } from '@/server/websites/service';
import { publishWebsite, saveWebsiteDraft, switchWebsiteTemplate, setPrimaryWebsiteDomain, suspendWebsite } from '@/server/actions/website.actions';
import { storeWebsiteImage, deleteWebsiteAsset } from '@/server/websites/media';
import { addWebsiteDomain, verifyWebsiteDomain, removeWebsiteDomain } from '@/server/websites/domains';
import { assertStandaloneWebsiteContract } from '@/server/websites/billing-safety';
import { executeMpV2Operation } from '@/server/commercial-billing/mercadopago-v2';
import { DASHBOARD_PERMISSIONS } from '@/core/permissions';
import { fixtureView } from '@/websites/fixtures/views';

const suite = describe.skipIf(!process.env.COMMERCIAL_V2_TEST_DATABASE_URL);
async function site(plan: 'PURAGENDA' | 'PURAGENDA_PLUS' = 'PURAGENDA_PLUS') {
  const f = await fixture({ plan, professionalTotal: 1, billingCycle: 'MONTHLY' }, true);
  actor.user = { id: f.user.id, role: 'ADMIN' };
  const s = await ensureWebsite(f.business.id, f.business.slug);
  await prisma.businessWebsite.update({ where: { id: s.id }, data: { draftConfig: fixtureView('a').config, publishedConfig: fixtureView('a').config, publishedTemplateKey: 'bella', publishedTemplateVersion: 1, publishedAt: new Date(), publishedRevision: 0, status: 'PUBLISHED' } });
  return { ...f, site: s };
}
suite('Audit 06 website policy and atomic storage on real PostgreSQL', () => {
  afterAll(async () => {
    await prisma.business.deleteMany({ where: { id: { in: businesses } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });
  it('reproduction: a valid Plus snapshot works with a legacy projection', async () => {
    const f = await site();
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { plan: 'INDIVIDUAL' } });
    expect((await resolveWebsiteCommercialAccess(f.business.id)).hosting).toBe(true);
    expect(await resolveWebsiteHost(`${f.site.subdomain}.puragenda.cl`)).not.toBeNull();
    expect(await publishWebsite(0)).toBeUndefined();
  });
  it('reproduction: a legitimate independent legacy add-on survives a V2 base plan', async () => {
    const f = await site('PURAGENDA');
    await prisma.websiteAddon.create({ data: { businessId: f.business.id, status: 'ACTIVE', provider: 'mercadopago', validUntil: new Date(Date.now() + 86400000) } });
    expect(await resolveWebsiteCommercialAccess(f.business.id)).toMatchObject({ source: 'LEGACY', editor: true, hosting: true });
    expect(await requireWebsiteManager()).toHaveProperty('business.id', f.business.id);
    await prisma.websiteAddon.update({where:{businessId:f.business.id},data:{status:'PAST_DUE'}});
    expect(await resolveWebsiteCommercialAccess(f.business.id)).toMatchObject({editor:false,legacyBillingReviewRequired:true});
  });
  it('reproduction: a legacy base account without website rights cannot edit', async () => {
    const f = await site('PURAGENDA');
    await prisma.commercialSubscription.update({ where: { businessId: f.business.id }, data: { planCode: 'INDIVIDUAL' } });
    await prisma.subscription.update({ where: { businessId: f.business.id }, data: { plan: 'INDIVIDUAL' } });
    await expect(requireWebsiteManager()).rejects.toThrow('sitio');
  });
  it('serializes concurrent edits, rejects stale revisions and preserves the live snapshot', async () => {
    const f = await site();
    const results = await Promise.all(['PRIMERO', 'SEGUNDO'].map(headline => saveWebsiteDraft({ ...fixtureView('a').config, headline }, 0, f.site.subdomain, 'bella')));
    expect(results.filter(r => r && 'revision' in r)).toHaveLength(1);
    expect(results.filter(r => r && 'error' in r)).toHaveLength(1);
    const s = await prisma.businessWebsite.findUniqueOrThrow({ where: { id: f.site.id } });
    expect(s.revision).toBe(1);
    expect(s.publishedConfig).toEqual(fixtureView('a').config);
    expect(await publishWebsite(0)).toHaveProperty('error');
    expect(await publishWebsite(1)).toBeUndefined();
    expect((await prisma.businessWebsite.findUniqueOrThrow({ where: { id: s.id } })).publishedConfig).toEqual(s.draftConfig);
  });
  it('keeps all template snapshots across switches and commercial suspension/recovery', async () => {
    const f = await site();
    for (const [i, key] of ['matchday', 'ritual', 'y2k', 'bella'].entries()) expect(await switchWebsiteTemplate(key, 1, i)).toEqual({ revision: i + 1 });
    const before = await prisma.businessWebsite.findUniqueOrThrow({ where: { id: f.site.id } });
    await prisma.commercialSubscription.update({ where: { businessId: f.business.id }, data: { status: 'PAST_DUE_BLOCKED' } });
    expect(await resolveWebsiteHost(`${f.site.subdomain}.puragenda.cl`)).toBeNull();
    expect(await saveWebsiteDraft(fixtureView('a').config, 4, f.site.subdomain)).toHaveProperty('error');
    expect(await prisma.businessWebsite.findUniqueOrThrow({ where: { id: f.site.id } })).toEqual(before);
    await prisma.commercialSubscription.update({ where: { businessId: f.business.id }, data: { status: 'TRIALING' } });
    expect(await resolveWebsiteHost(`${f.site.subdomain}.puragenda.cl`)).not.toBeNull();
  });
  it('rejects another tenant media reference and incomplete publication', async () => {
    const a = await site(), b = await site();
    await prisma.websiteMedia.create({ data: { websiteId: b.site.id, publicId: randomUUID(), secureUrl: 'https://res.cloudinary.com/audit06/image/upload/foreign.webp', width: 128, height: 128, format: 'webp', bytes: 200, usage: 'hero' } });
    actor.user = { id: a.user.id, role: 'ADMIN' };
    expect(await saveWebsiteDraft({ ...fixtureView('a').config, heroImage: 'https://res.cloudinary.com/audit06/image/upload/foreign.webp' }, 0, a.site.subdomain)).toHaveProperty('error');
    expect(await saveWebsiteDraft({ ...fixtureView('a').config, heroImage: '' }, 0, a.site.subdomain)).toEqual({ revision: 1 });
    expect(await publishWebsite(1)).toHaveProperty('error');
  });
  it.each(['PURAGENDA', 'PURAGENDA_PLUS'] as const)('enforces %s trial, payment, cancellation, expiry, upgrade and downgrade', async plan => {
    const f = await site(plan), plus = plan === 'PURAGENDA_PLUS';
    expect((await resolveWebsiteCommercialAccess(f.business.id)).editor).toBe(plus);
    const now = new Date(), end = new Date(+now + 86400000), start = new Date(+now - 86400000);
    for (const status of ['PENDING_PAYMENT', 'ACTIVE'] as const) {
      await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { status, periodStart: start, periodEnd: end, lastPaymentStatus: null, lastPaymentAt: null, lastPaymentEventId: null } });
      expect((await resolveWebsiteCommercialAccess(f.business.id)).hosting).toBe(false);
    }
    await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { status: 'ACTIVE', lastPaymentStatus: 'CONFIRMED', lastPaymentAt: start, lastPaymentEventId: 'synthetic-verified-evidence', renewalCancellationStatus: 'CANCELLED_VERIFIED', renewalCancelledAt: start } });
    expect((await resolveWebsiteCommercialAccess(f.business.id)).hosting).toBe(plus);
    expect((await resolveWebsiteCommercialAccess(f.business.id, end)).hosting).toBe(false);
    await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: plus ? 'PURAGENDA' : 'PURAGENDA_PLUS' } });
    expect((await resolveWebsiteCommercialAccess(f.business.id)).hosting).toBe(!plus);
    await prisma.business.update({ where: { id: f.business.id }, data: { deletedAt: now } });
    expect((await resolveWebsiteCommercialAccess(f.business.id)).editor).toBe(false);
    expect(await resolveWebsiteHost(`${f.site.subdomain}.puragenda.cl`)).toBeNull();
  });
  it('bounds legitimate renewal grace to exactly 48 hours using Audit 05 evidence', async () => {
    const f = await site(), end = new Date(Date.now() - 3600000), start = new Date(+end - 30 * 86400000);
    await prisma.commercialSubscription.update({ where: { id: f.sub.id }, data: { status: 'ACTIVE', provider: 'MERCADO_PAGO', externalSubscriptionId: randomUUID(), periodStart: start, periodEnd: end, lastPaymentStatus: 'CONFIRMED', lastPaymentAt: start, lastPaymentEventId: 'synthetic-confirmed-payment' } });
    for (const offset of [0, 24 * 3600000, 48 * 3600000 - 1, 48 * 3600000]) expect((await resolveWebsiteCommercialAccess(f.business.id, new Date(+end + offset))).hosting).toBe(offset < 48 * 3600000);
  });
  it('blocks duplicate Plus billing before preparation and again before execution', async () => {
    const f = await site();
    await expect(assertStandaloneWebsiteContract(f.business.id, prisma)).rejects.toThrow('contratación independiente');
    const op = await f.prepare();
    await prisma.websiteAddon.create({ data: { businessId: f.business.id, provider: 'mercadopago', status: 'ACTIVE', mpSubscriptionId: randomUUID(), validUntil: new Date(Date.now() + 86400000) } });
    await expect(f.prepare()).rejects.toThrow('migración');
    await expect(executeMpV2Operation(f.business.id, op.id, f.user.email, f.provider)).rejects.toThrow('migración');
    expect(f.port.create).not.toHaveBeenCalled();
  });
  it('isolates permissions, inactive staff and foreign owner domain/media IDs', async () => {
    const a = await site(), b = await site();
    const d = await prisma.websiteDomain.create({ data: { websiteId: a.site.id, hostname: `a-${randomUUID()}.example.org`, verificationToken: randomUUID() } });
    const asset = await prisma.websiteMedia.create({ data: { websiteId: a.site.id, publicId: randomUUID(), secureUrl: '/audit06-foreign.webp', width: 16, height: 16, bytes: 10, format: 'webp', usage: 'hero' } });
    expect(await setPrimaryWebsiteDomain(d.id)).toHaveProperty('error');
    await expect(removeWebsiteDomain(d.id)).rejects.toThrow('encontrado');
    await expect(deleteWebsiteAsset(asset.id)).rejects.toThrow('encontrada');
    expect((await prisma.businessWebsite.findUniqueOrThrow({ where: { id: a.site.id } })).revision).toBe(0);
    const member = await prisma.staff.create({ data: { businessId: a.business.id, userId: b.user.id, name: 'Synthetic restricted staff' } });
    // Remove the second owned business so the effective session tenant is A.
    await prisma.business.update({ where: { id: b.business.id }, data: { ownerId: null } });
    actor.user = { id: b.user.id, role: 'STAFF' };
    await expect(requireWebsiteManager()).rejects.toThrow('autorizado');
    const profile = await prisma.accessProfile.create({ data: { businessId: a.business.id, name: 'Website QA', permissions: [DASHBOARD_PERMISSIONS.WEBSITE_MANAGE] } });
    await prisma.staff.update({ where: { id: member.id }, data: { accessProfileId: profile.id } });
    expect(await requireWebsiteManager()).toHaveProperty('business.id', a.business.id);
    await expect(addWebsiteDomain('staff.example.org')).rejects.toThrow('autorizado');
    await prisma.staff.update({ where: { id: member.id }, data: { isActive: false } });
    await expect(requireWebsiteManager()).rejects.toThrow('autorizado');
    actor.user = null;
    await expect(requireWebsiteManager()).rejects.toThrow('autenticado');
  });
  it('requires current DNS ownership, serializes hostname claims and does not route stale proofs', async () => {
    const f = await site(), hostname = `domain-${randomUUID()}.example.org`;
    const claims = await Promise.allSettled([addWebsiteDomain(hostname), addWebsiteDomain(hostname)]);
    expect(claims.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const domain = await prisma.websiteDomain.findUniqueOrThrow({ where: { hostname } });
    const provider = { key: 'mock' as const, addDomain: vi.fn(), getDomainStatus: vi.fn(), removeDomain: vi.fn(), verifyDomain: vi.fn().mockResolvedValue({ active: true, verified: true, records: [], message: 'Synthetic SSL active' }) };
    dns.txt.mockResolvedValue([['old-token']]);
    await verifyWebsiteDomain(domain.id, undefined, provider);
    expect(provider.addDomain).not.toHaveBeenCalled();
    dns.txt.mockResolvedValue([[domain.verificationToken]]);
    await verifyWebsiteDomain(domain.id, undefined, provider);
    expect(await resolveWebsiteHost(hostname)).toHaveProperty('businessId', f.business.id);
    await prisma.websiteDomain.update({ where: { id: domain.id }, data: { tenantVerifiedAt: new Date(Date.now() - 25 * 3600000) } });
    dns.txt.mockResolvedValue([['other-tenant']]);
    expect(await resolveWebsiteHost(hostname)).toBeNull();
    await removeWebsiteDomain(domain.id);
    expect(provider.removeDomain).not.toHaveBeenCalled();
    const replacement = await addWebsiteDomain(hostname);
    expect(replacement.verificationToken).not.toBe(domain.verificationToken);
  });
  it('enforces media quota under two concurrent uploads using the real tenant lock', async () => {
    const f = await site();
    await prisma.websiteMedia.createMany({ data: Array.from({ length: 149 }, (_, i) => ({ websiteId: f.site.id, publicId: randomUUID(), secureUrl: `/audit06/${f.site.id}/${i}.webp`, width: 16, height: 16, bytes: 20, format: 'webp', usage: 'hero' })) });
    let release!: () => void, uploads = 0;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    cloud.destroy.mockResolvedValue({ result: 'ok' });
    cloud.upload.mockImplementation(async (_data: string, options: {public_id: string}) => { if (++uploads === 2) release(); await barrier; return { secure_url: `https://res.cloudinary.com/audit06/image/upload/${options.public_id}.webp` }; });
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: 'red' } }).png().toBuffer();
    const upload = () => { const form = new FormData(); form.set('image', new File([new Uint8Array(bytes)], 'synthetic.png', { type: 'image/png' })); return storeWebsiteImage(form); };
    const results = await Promise.allSettled([upload(), upload()]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.websiteMedia.count({ where: { websiteId: f.site.id, deletedAt: null } })).toBe(150);
    expect(cloud.destroy).toHaveBeenCalledTimes(1);
  });
  it('public rendering omits unpublished library metadata and unsafe inherited links', async () => {
    const f = await site(), config = { ...fixtureView('a').config, mediaAssets: [{ id: 'private-asset', publicId: 'private-library', secureUrl: '/private-upload.webp', width: 16, height: 16, bytes: 20, format: 'webp' }] };
    await prisma.business.update({ where: { id: f.business.id }, data: { mapsUrl: 'javascript:alert(1)' } });
    const s = await prisma.businessWebsite.update({ where: { id: f.site.id }, data: { publishedConfig: config, draftConfig: config } });
    const publicView = await websiteView(s, false), preview = await websiteView(s, true);
    expect(publicView.config.mediaAssets).toBeUndefined(); expect(publicView.business.mapsUrl).toBeNull();
    expect(preview.config.mediaAssets).toHaveLength(1);
    await suspendWebsite();
    expect(await resolveWebsiteHost(`${s.subdomain}.puragenda.cl`)).toBeNull();
    expect((await prisma.businessWebsite.findUniqueOrThrow({ where: { id: s.id } })).publishedConfig).toEqual(config);
  });
  it('reproduction: website creation recovers when another site has taken the business slug', async () => {
    const a = await site(), b = await fixture({ plan: 'PURAGENDA_PLUS', professionalTotal: 1, billingCycle: 'MONTHLY' }, true);
    await prisma.businessWebsite.update({ where: { id: a.site.id }, data: { subdomain: b.business.slug } });
    const created = await ensureWebsite(b.business.id, b.business.slug);
    expect(created.businessId).toBe(b.business.id);
    expect(created.subdomain).not.toBe(b.business.slug);
  });
  it('rechecks commercial access after waiting behind a concurrent plan change', async () => {
    const f = await site();
    let saving!: ReturnType<typeof saveWebsiteDraft>;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${f.business.id} FOR UPDATE`;
      saving = saveWebsiteDraft({ ...fixtureView('a').config, headline: 'Must not persist after downgrade' }, 0, f.site.subdomain);
      let waiting = false;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
        // Observe from autocommit: PostgreSQL may cache activity snapshots
        // inside the transaction holding the lock under test.
        const rows = await prisma.$queryRaw<Array<{count:bigint}>>`SELECT count(*) AS count FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND query LIKE 'SELECT id FROM "Business"%FOR UPDATE'`;
        waiting = rows[0].count > 0;
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await tx.commercialSubscription.update({ where: { id: f.sub.id }, data: { planCode: 'PURAGENDA' } });
    }, { timeout: 15000 });
    expect(await saving).toHaveProperty('error');
    expect((await prisma.businessWebsite.findUniqueOrThrow({ where: { id: f.site.id } })).revision).toBe(0);
  }, 20000);
  it('serializes image deletion against a draft starting to use that image', async () => {
    const f = await site();
    const asset = await prisma.websiteMedia.create({data:{websiteId:f.site.id,publicId:randomUUID(),secureUrl:`/audit06/${randomUUID()}.webp`,width:32,height:32,bytes:100,format:'webp',usage:'hero',provider:'local'}});
    const results = await Promise.allSettled([
      saveWebsiteDraft({...fixtureView('a').config,heroImage:asset.secureUrl},0,f.site.subdomain),
      deleteWebsiteAsset(asset.id),
    ]);
    const saved = results[0].status === 'fulfilled' && !('error' in results[0].value);
    const current = await prisma.websiteMedia.findUniqueOrThrow({where:{id:asset.id}});
    if (saved) { expect(current.deletedAt).toBeNull(); expect(results[1].status).toBe('rejected'); }
    else { expect(current.deletedAt).not.toBeNull(); expect(results[1].status).toBe('fulfilled'); }
  });
  it('keeps website tables opaque to a browser role even with SELECT grants', async () => {
    const tables = ['BusinessWebsite','WebsiteAddon','WebsiteDomain','DomainRequest','WebsiteMedia','WebsiteBillingEvent','WebsiteOfferEligibility','WebsiteCommercialEvent','WebsiteCheckoutOperation'];
    const rows = await prisma.$queryRaw<Array<{relname:string;relrowsecurity:boolean}>>`SELECT relname,relrowsecurity FROM pg_class WHERE relname = ANY(${tables})`;
    expect(rows).toHaveLength(tables.length); expect(rows.every(row=>row.relrowsecurity)).toBe(true);
    await expect(prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('GRANT SELECT ON ' + tables.map(table=>`"${table}"`).join(',') + ' TO anon');
      await tx.$executeRawUnsafe('SET LOCAL ROLE anon');
      for (const table of tables) expect((await tx.$queryRawUnsafe<Array<{count:bigint}>>(`SELECT count(*) AS count FROM "${table}"`))[0].count).toBe(BigInt(0));
      throw new Error('ROLLBACK_QA_PRIVILEGES');
    })).rejects.toThrow('ROLLBACK_QA_PRIVILEGES');
  });
});
