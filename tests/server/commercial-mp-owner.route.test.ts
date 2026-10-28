import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ enabled: vi.fn(), auth: vi.fn(), owner: vi.fn(), load: vi.fn(), checkout: vi.fn(), cancel: vi.fn(), limit: vi.fn() }));
vi.mock("@/server/puri/growth/access", () => ({ growthSandboxEnabled: m.enabled }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: m.auth }));
vi.mock("@/server/puri/rate-limit", () => ({ checkPuriRateLimit: m.limit }));
vi.mock("@/server/commercial-billing/mercadopago-owner", () => ({ requireCommercialBillingOwner: m.owner,
  loadOwnerMercadoPago: m.load, checkoutOwnerMercadoPago: m.checkout, cancelOwnerMercadoPago: m.cancel }));
import { POST } from "@/app/api/dashboard/puri-plus/billing/route";
const request = (body: unknown, origin = "http://localhost") => new NextRequest("http://localhost/api/dashboard/puri-plus/billing", {
  method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body),
});
describe("owner commercial billing API boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); m.enabled.mockReturnValue(true); m.auth.mockResolvedValue({ id: "owner" });
    m.owner.mockResolvedValue({ businessId: "server-business", actorId: "owner" }); m.load.mockResolvedValue({ status: "PENDING_PAYMENT" }); m.limit.mockResolvedValue({ allowed: true }); });
  it("is sealed before auth or provider work when disabled", async () => {
    m.enabled.mockReturnValue(false); expect((await POST(request({ action: "CHECKOUT", explicit: true }))).status).toBe(404);
    expect(m.auth).not.toHaveBeenCalled(); expect(m.checkout).not.toHaveBeenCalled();
  });
  it("rejects cross-origin mutation before authentication or provider work", async () => {
    expect((await POST(request({ action: "CHECKOUT", explicit: true }, "https://attacker.invalid"))).status).toBe(403);
    expect(m.auth).not.toHaveBeenCalled(); expect(m.checkout).not.toHaveBeenCalled();
  });
  it("requires a verified session and durable ownership", async () => {
    m.auth.mockResolvedValueOnce(null); expect((await POST(request({ action: "LOAD" }))).status).toBe(401);
    m.owner.mockRejectedValueOnce(new Error("OWNER_REQUIRED")); expect((await POST(request({ action: "CHECKOUT", explicit: true }))).status).toBe(403);
    expect(m.checkout).not.toHaveBeenCalled();
  });
  it("does not accept caller-selected business, price, payer or provider fields", async () => {
    for (const injected of [{ businessId: "other" }, { amount: 1 }, { payerEmail: "victim@example.invalid" }, { provider: "PADDLE" }]) {
      expect((await POST(request({ action: "CHECKOUT", explicit: true, ...injected }))).status).toBe(400);
    }
    expect(m.checkout).not.toHaveBeenCalled();
  });
  it("requires explicit confirmation and a reviewed contract for cancellation", async () => {
    expect((await POST(request({ action: "CHECKOUT" }))).status).toBe(400);
    expect((await POST(request({ action: "CANCEL_RENEWAL", explicit: true }))).status).toBe(400);
    expect(m.checkout).not.toHaveBeenCalled(); expect(m.cancel).not.toHaveBeenCalled();
  });
  it("bounds oversized bodies and never returns raw provider failures", async () => {
    expect((await POST(request({ action: "CHECKOUT", explicit: true, payload: "x".repeat(3000) }))).status).toBe(400);
    m.checkout.mockRejectedValueOnce(new Error("provider payload contains private data"));
    const r = await POST(request({ action: "CHECKOUT", explicit: true }));
    expect(await r.json()).toEqual({ code: "BILLING_UNAVAILABLE" });
  });
  it("throttles before performing a provider mutation", async () => {
    m.limit.mockResolvedValueOnce({ allowed: false, retryAfter: 60 });
    const r = await POST(request({ action: "CHECKOUT", explicit: true })); expect(r.status).toBe(429); expect(r.headers.get("Retry-After")).toBe("60");
    expect(m.checkout).not.toHaveBeenCalled();
  });
});
