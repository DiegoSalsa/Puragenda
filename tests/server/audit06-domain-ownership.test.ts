import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ txt: vi.fn() }));
vi.mock('node:dns/promises', () => ({ resolveTxt: m.txt }));
import { resolveWebsiteDomains, websiteDomainOwnership, websiteTxtMatches, WEBSITE_DNS_PROOF_MS } from '@/server/websites/domain-ownership';
const now = new Date('2026-11-01T12:00:00Z');
const domain = { hostname: 'studio.cl', verificationToken: 'tenant-token-a', tenantVerifiedAt: new Date(+now - WEBSITE_DNS_PROOF_MS) };
beforeEach(() => vi.resetAllMocks());
describe('Audit 06 bounded DNS ownership', () => {
  it('shares a single DNS decision between active links and ownership review within one resolution', async () => {
    m.txt.mockResolvedValue([['other-reservation']]);
    const d = { ...domain, status: 'ACTIVE' };
    expect(await resolveWebsiteDomains([d, { ...d }], now)).toEqual({ active: [], review: [d, d] });
    expect(m.txt).toHaveBeenCalledTimes(1);
    // The next resolution must not reuse a failed proof from another request.
    m.txt.mockResolvedValue([['tenant-token-a']]);
    expect(await resolveWebsiteDomains([d], now)).toEqual({ active: [d], review: [] });
    expect(m.txt).toHaveBeenCalledTimes(2);
  });
  it('does not treat pending domains as active or use DNS for an unexpired proof', async () => {
    const active = { ...domain, status: 'ACTIVE', tenantVerifiedAt: new Date(+now - 1000) };
    expect(await resolveWebsiteDomains([active, { ...domain, status: 'PENDING' }], now)).toEqual({ active: [active], review: [] });
    expect(m.txt).not.toHaveBeenCalled();
  });
  it('requires fresh DNS for an expired proof, including an old TXT from another reservation', async () => {
    m.txt.mockResolvedValue([['tenant-token-b']]);
    expect(await websiteDomainOwnership(domain, now)).toBe(false);
    m.txt.mockResolvedValue([['tenant-', 'token-a']]);
    expect(await websiteDomainOwnership(domain, now)).toBe(true);
    expect(m.txt).toHaveBeenCalledWith('_puragenda.studio.cl');
  });
  it('denies unverified/future proofs and DNS failures', async () => {
    expect(await websiteDomainOwnership({ ...domain, tenantVerifiedAt: null }, now)).toBe(false);
    expect(await websiteDomainOwnership({ ...domain, tenantVerifiedAt: new Date(+now + 1) }, now)).toBe(false);
    m.txt.mockRejectedValue(new Error('DNS outage'));
    expect(await websiteDomainOwnership(domain, now)).toBe(false);
  });
  it('uses only an unexpired bounded proof', async () => {
    expect(await websiteDomainOwnership({ ...domain, tenantVerifiedAt: new Date(+now - WEBSITE_DNS_PROOF_MS + 1) }, now)).toBe(true);
    expect(m.txt).not.toHaveBeenCalled();
  });
  it('bounds an unresponsive resolver', async () => {
    vi.useFakeTimers();
    try { m.txt.mockReturnValue(new Promise(() => {})); const result = websiteTxtMatches('studio.cl', 'token'); await vi.advanceTimersByTimeAsync(3000); expect(await result).toBe(false); }
    finally { vi.useRealTimers(); }
  });
});
