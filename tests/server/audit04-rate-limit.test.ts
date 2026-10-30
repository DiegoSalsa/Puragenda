import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { rateLimit } from "@/server/lib/rate-limit";
import { trustedClientIp } from "@/server/lib/distributed-rate-limit";
describe("audit 04 rate limit reproduction", () => {
  it("demonstrates memory isolation between two workers with the same configuration", () => {
    const a = rateLimit({ max: 1, windowMs: 60000 }), b = rateLimit({ max: 1, windowMs: 60000 });
    const req = new NextRequest("http://localhost", { headers: { "x-forwarded-for": "192.0.2.4" } });
    expect(a.check(req)).toBeNull(); expect(a.check(req)?.status).toBe(429);
    expect(b.check(req)).toBeNull(); // A second instance forgets the first worker's budget.
  });
  it("demonstrates why direct, non-proxied X-Forwarded-For must not identify a client", () => {
    const a = rateLimit({ max: 1, windowMs: 60000 });
    expect(a.check(new NextRequest("http://localhost", { headers: { "x-forwarded-for": "192.0.2.5" } }))).toBeNull();
    expect(a.check(new NextRequest("http://localhost", { headers: { "x-forwarded-for": "192.0.2.6" } }))).toBeNull();
    vi.unstubAllEnvs();
  });
  it("uses the provider IP on Vercel and requires explicit proxy trust elsewhere", () => {
    const req = new NextRequest("http://localhost", { headers: { "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "192.0.2.99", "x-real-ip": "192.0.2.98" } });
    vi.stubEnv("VERCEL", "1"); expect(trustedClientIp(req)).toBe("192.0.2.1");
    vi.stubEnv("VERCEL", ""); vi.stubEnv("TRUST_PROXY_HEADERS", ""); expect(trustedClientIp(req)).toBe("unknown");
    vi.stubEnv("TRUST_PROXY_HEADERS", "1"); expect(trustedClientIp(req)).toBe("192.0.2.99");
    vi.unstubAllEnvs();
  });
});
