import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $queryRaw: mocks.query } }));

import { checkPuriRateLimit, PURI_RATE_LIMIT } from "@/server/puri/rate-limit";

describe("Puri rate limit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a hashed key and allows a request under the limit", async () => {
    mocks.query.mockResolvedValue([{ count: 1, resetAt: new Date(Date.now() + 60_000) }]);
    const result = await checkPuriRateLimit("business-1:user-1");
    expect(result.allowed).toBe(true);
    expect(PURI_RATE_LIMIT).toEqual({ windowMinutes: 10, maxRequests: 30 });
    const values = mocks.query.mock.calls[0].slice(1);
    expect(values[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(values).not.toContain("business-1:user-1");
  });

  it("rejects requests above the limit", async () => {
    mocks.query.mockResolvedValue([{ count: 31, resetAt: new Date(Date.now() + 60_000) }]);
    expect((await checkPuriRateLimit("business-1:user-1")).allowed).toBe(false);
  });
});
