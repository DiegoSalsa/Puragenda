import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({ host: vi.fn(), writer: vi.fn() }));
vi.mock('@/server/websites/service', () => ({ resolveWebsiteHost: m.host, requireWebsiteManager: vi.fn() }));
vi.mock('@/server/lib/rate-limit', () => ({ rateLimit: () => ({ check: () => null }) }));
vi.mock('@/app/api/business/[slug]/book/route', () => ({ POST: m.writer }));
import { websiteBooking } from '@/server/websites/booking';
beforeEach(() => { vi.clearAllMocks(); m.host.mockResolvedValue(null); });
describe('Audit 06 website booking boundary', () => {
  it('reproduction: denies real booking in explicitly identified preview requests', async () => {
    const r = await websiteBooking(new NextRequest('https://studio.cl/api/website/book?preview=1', { method: 'POST', headers: { host: 'studio.cl', origin: 'https://studio.cl' }, body: '{}' }));
    expect(r.status).toBe(403); expect(m.host).not.toHaveBeenCalled(); expect(m.writer).not.toHaveBeenCalled();
  });
  it.each(['garbage', 'null', 'javascript://studio.cl', 'https://studio.cl/path', 'https://evil.cl'])('rejects malformed or foreign Origin %s', async origin => {
    const r = await websiteBooking(new NextRequest('https://studio.cl/api/website/book', { method: 'POST', headers: { host: 'studio.cl', origin }, body: '{}' }));
    expect(r.status).toBe(403); expect(m.host).not.toHaveBeenCalled(); expect(m.writer).not.toHaveBeenCalled();
  });
});
