import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ txt: vi.fn() }));
vi.mock('node:dns/promises', () => ({ resolveTxt: m.txt }));
import { websiteDomainOwnership, websiteTxtMatches, WEBSITE_DNS_PROOF_MS } from '@/server/websites/domain-ownership';
const now = new Date('2026-11-01T12:00:00Z');
const domain = { hostname: 'studio.cl', verificationToken: 'tenant-token-a', tenantVerifiedAt: new Date(+now - WEBSITE_DNS_PROOF_MS) };
beforeEach(() => vi.resetAllMocks());
describe('Audit 06 bounded DNS ownership', () => {
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
