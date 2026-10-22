import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  enabled: vi.fn(),
  auth: vi.fn(),
  admin: vi.fn(),
  scope: vi.fn(),
  context: vi.fn(),
  analyze: vi.fn(),
  limit: vi.fn(),
  sameOrigin: vi.fn(),
}));
vi.mock("@/server/auth/admin-session", () => ({
  getApiAdminSessionUser: mocks.admin,
}));
vi.mock("@/server/puri/growth/access", () => ({
  growthSandboxEnabled: mocks.enabled,
  createGrowthScope: mocks.scope,
}));
vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: mocks.auth,
}));
vi.mock("@/server/puri/context", () => ({ createPuriContext: mocks.context }));
vi.mock("@/server/puri/rate-limit", () => ({
  checkPuriRateLimit: mocks.limit,
}));
vi.mock("@/server/security/same-origin", () => ({
  requireSameOrigin: mocks.sameOrigin,
}));
vi.mock("@/server/puri/growth/analysis", () => ({
  analyzeGrowth: mocks.analyze,
  expireGrowthRecords: vi.fn(),
  listGrowthSignals: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/server/puri/growth/recommendations", () => ({
  listGrowthRecommendations: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/server/puri/growth/budgets", () => ({
  growthBudgetSnapshot: vi.fn().mockResolvedValue([]),
  growthUsageSummary: vi.fn().mockResolvedValue(null),
  GrowthBudgetError: class extends Error {},
}));
vi.mock("@/server/puri/growth/runtime", () => ({
  answerWithGrowthPuri: vi.fn(),
}));
vi.mock("@/server/puri/growth/monitoring", () => ({
  growthPlatformMetrics: vi.fn(),
}));
import { POST } from "@/app/api/internal/puri-plus/route";
import { PuriAccessError } from "@/server/puri/types";
const req = (body: unknown) =>
  new NextRequest("http://localhost/api/internal/puri-plus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
describe("Puri+ internal API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enabled.mockReturnValue(true);
    mocks.auth.mockResolvedValue({ id: "u" });
    mocks.sameOrigin.mockReturnValue(null);
    mocks.scope.mockResolvedValue({ businessId: "b", actorId: "u" });
    mocks.context.mockResolvedValue({ business: { id: "b" }, location: null });
    mocks.limit.mockResolvedValue({ allowed: true });
  });
  it("returns 404 before authentication or database work when closed", async () => {
    mocks.enabled.mockReturnValue(false);
    expect((await POST(req({ action: "ANALYZE" }))).status).toBe(404);
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it("requires an authenticated session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(req({ action: "LOAD" }))).status).toBe(401);
  });
  it("requires the existing Superadmin session for platform metrics", async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await POST(req({ action: "MONITOR" }))).status).toBe(403);
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it("requires same origin for review and mutation requests", async () => {
    mocks.sameOrigin.mockReturnValue(new Response(null, { status: 403 }));
    expect((await POST(req({ action: "APPROVE" }))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it.each([
    { action: "ANALYZE", businessId: "other" },
    { action: "SEND_EMAIL" },
    { action: "APPROVE", evidence: { forged: true } },
  ])("rejects arbitrary tenant IDs, actions and evidence %#", async (body) => {
    expect((await POST(req(body))).status).toBe(400);
    expect(mocks.scope).not.toHaveBeenCalled();
  });
  it("authorizes Plus before any analysis", async () => {
    mocks.scope.mockRejectedValue(
      new PuriAccessError("PLUS_ENTITLEMENT_REQUIRED"),
    );
    expect((await POST(req({ action: "ANALYZE" }))).status).toBe(403);
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it("reuses the existing per-user Puri rate limit", async () => {
    mocks.limit.mockResolvedValue({ allowed: false, retryAfter: 30 });
    const r = await POST(req({ action: "ANALYZE" }));
    expect(r.status).toBe(429);
    expect(r.headers.get("Retry-After")).toBe("30");
    expect(mocks.analyze).not.toHaveBeenCalled();
  });
  it("serves only the authorized scope without caching responses", async () => {
    const r = await POST(req({ action: "LOAD" }));
    expect(r.status).toBe(200);
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.scope).toHaveBeenCalledWith(expect.anything(), false);
  });
});
