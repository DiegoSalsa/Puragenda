import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  enabled: vi.fn(),
  auth: vi.fn(),
  scope: vi.fn(),
  context: vi.fn(),
  guard: vi.fn(),
  origin: vi.fn(),
  limit: vi.fn(),
  snapshot: vi.fn(),
  authorize: vi.fn(),
  run: vi.fn(),
  prepare: vi.fn(),
  admin: vi.fn(),
}));
vi.mock("@/server/contact-flow/policy", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  contactLabEnabled: m.enabled,
  requireContactScope: m.guard,
}));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: m.auth }));
vi.mock("@/server/auth/admin-session", () => ({
  getApiAdminSessionUser: m.admin,
}));
vi.mock("@/server/puri/context", () => ({ createPuriContext: m.context }));
vi.mock("@/server/puri/growth/access", () => ({ createGrowthScope: m.scope }));
vi.mock("@/server/security/same-origin", () => ({
  requireSameOrigin: m.origin,
}));
vi.mock("@/server/puri/rate-limit", () => ({ checkPuriRateLimit: m.limit }));
vi.mock("@/server/contact-flow/campaigns", () => ({
  authorizeCampaign: m.authorize,
  contactSnapshot: m.snapshot,
  prepareCampaign: m.prepare,
}));
vi.mock("@/server/contact-flow/worker", () => ({ runContactWorker: m.run }));
import { POST } from "@/app/api/internal/contact-flow/route";
const request = (data: unknown) =>
  new NextRequest("http://localhost/api/internal/contact-flow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
describe("Contact Flow authenticated API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.enabled.mockReturnValue(true);
    m.auth.mockResolvedValue({ id: "owner" });
    m.scope.mockResolvedValue({ businessId: "own", actorId: "owner" });
    m.origin.mockReturnValue(null);
    m.guard.mockResolvedValue(undefined);
    m.limit.mockResolvedValue({ allowed: true });
    m.snapshot.mockResolvedValue({
      mode: "SIMULATED_ONLY",
      externalBlocked: true,
      campaigns: [],
    });
  });
  it("returns 404 while sealed before authentication or database access", async () => {
    m.enabled.mockReturnValue(false);
    expect((await POST(request({ action: "LOAD" }))).status).toBe(404);
    expect(m.auth).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    m.auth.mockResolvedValue(null);
    expect((await POST(request({ action: "LOAD" }))).status).toBe(401);
    expect(m.snapshot).not.toHaveBeenCalled();
  });
  it("enforces same-origin CSRF protection before every action", async () => {
    m.origin.mockReturnValue(new Response(null, { status: 403 }));
    expect(
      (await POST(request({ action: "RUN", explicit: true }))).status,
    ).toBe(403);
    expect(m.auth).not.toHaveBeenCalled();
  });
  it.each([
    { action: "LOAD", businessId: "foreign" },
    { action: "SEND_EMAIL" },
    { action: "RUN", recipients: ["foreign"] },
    { action: "AUTHORIZE", consent: true },
  ])(
    "rejects arbitrary tenant, recipient and consent input %#",
    async (data) => {
      expect((await POST(request(data))).status).toBe(400);
      expect(m.scope).not.toHaveBeenCalled();
    },
  );
  it("checks effective scope before serving campaigns", async () => {
    m.guard.mockRejectedValue(new Error("CONTACT_FLOW_FORBIDDEN"));
    expect((await POST(request({ action: "LOAD" }))).status).toBe(403);
    expect(m.snapshot).not.toHaveBeenCalled();
  });
  it("applies the existing rate limiter and retry header", async () => {
    m.limit.mockResolvedValue({ allowed: false, retryAfter: 30 });
    const r = await POST(request({ action: "LOAD" }));
    expect(r.status).toBe(429);
    expect(r.headers.get("Retry-After")).toBe("30");
    expect(m.snapshot).not.toHaveBeenCalled();
  });
  it("does not dispatch without explicit confirmation", async () => {
    expect((await POST(request({ action: "RUN" }))).status).toBe(409);
    expect(m.run).not.toHaveBeenCalled();
  });
  it("never lets request input choose another business for the worker", async () => {
    expect(
      (await POST(request({ action: "RUN", explicit: true }))).status,
    ).toBe(200);
    expect(m.run).toHaveBeenCalledWith({ businessId: "own", limit: 5 });
  });
  it("uses only server scope and exact review values for execution authorization", async () => {
    const r = await POST(
      request({
        action: "AUTHORIZE",
        id: "campaign",
        hash: "a".repeat(64),
        version: 2,
        explicit: true,
      }),
    );
    expect(r.status).toBe(200);
    expect(m.authorize).toHaveBeenCalledWith(
      { businessId: "own", actorId: "owner" },
      "campaign",
      "a".repeat(64),
      2,
      true,
    );
    expect(r.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("requires the independent Superadmin session to change the global kill switch", async () => {
    m.admin.mockResolvedValue(null);
    expect(
      (
        await POST(
          request({ action: "GLOBAL_KILL", killed: true, explicit: true }),
        )
      ).status,
    ).toBe(403);
  });
});
