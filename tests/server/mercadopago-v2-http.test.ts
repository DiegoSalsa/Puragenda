import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ user: vi.fn(), business: vi.fn(), sub: vi.fn(), prepare: vi.fn(), execute: vi.fn(), cancel: vi.fn(), reconcile: vi.fn(), provider: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: m.user }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: m.business }));
vi.mock("@/server/db/prisma", () => ({ prisma: { commercialSubscription: { findUnique: m.sub } } }));
vi.mock("@/server/commercial-billing/mercadopago-v2-provider", () => ({ createMpV2Provider: m.provider }));
vi.mock("@/server/commercial-billing/mercadopago-v2", () => ({ prepareMpV2Operation: m.prepare, executeMpV2Operation: m.execute, cancelMpV2Renewal: m.cancel, reconcileMpV2Operation: m.reconcile }));
import { handleMpV2Command } from "@/server/commercial-billing/mercadopago-v2-http";
const body = { action: "SUBSCRIBE", accepted: true, expectedContractHash: "a".repeat(64), idempotencyKey: "synthetic-request" };
const request = (value: unknown, origin = "https://example.test") => new NextRequest("https://example.test/api/billing/subscribe", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(value) });
describe("V2 billing HTTP authorization and consent", () => {
  beforeEach(() => { vi.clearAllMocks(); m.user.mockResolvedValue({ id: "owner", email: "test@example.invalid" }); m.business.mockResolvedValue({ id: "business", ownerId: "owner" }); m.sub.mockResolvedValue({ planCode: "PURAGENDA_PLUS", legacySubscriptionId: null, termsSnapshot: { origin: "registration_v2" } }); m.provider.mockReturnValue({ config: { environment: "V2_SANDBOX" } }); m.prepare.mockResolvedValue({ id: "operation" }); m.execute.mockResolvedValue({ status: "AWAITING_PAYMENT" }); });
  it("requires same-origin, authentication and ownership before provider IO", async () => {
    expect((await handleMpV2Command(request(body, "https://evil.invalid"))).status).toBe(403);
    m.user.mockResolvedValue(null); expect((await handleMpV2Command(request(body))).status).toBe(401);
    m.user.mockResolvedValue({ id: "staff" }); expect((await handleMpV2Command(request(body))).status).toBe(403);
    expect(m.provider).not.toHaveBeenCalled();
  });
  it.each([{ ...body, accepted: false }, { ...body, amount: 1 }, { ...body, expectedContractHash: undefined }, { ...body, selection: { plan: "PURAGENDA", professionalTotal: 1, billingCycle: "MONTHLY" } }])("rejects missing consent, a stale/absent version and forged checkout fields", async input => {
    expect((await handleMpV2Command(request(input))).status).toBe(400); expect(m.prepare).not.toHaveBeenCalled();
  });
  it("uses the authenticated owner and forwards the displayed contract version", async () => {
    expect((await handleMpV2Command(request(body))).status).toBe(200);
    expect(m.prepare).toHaveBeenCalledWith(expect.objectContaining({ businessId: "business", actorId: "owner", expectedContractHash: body.expectedContractHash }), expect.anything());
    expect(m.execute).toHaveBeenCalledWith("business", "operation", "test@example.invalid", expect.anything());
  });
  it("does not expose secrets from provider errors", async () => {
    m.execute.mockRejectedValue(new Error("Authorization: Bearer sensitive-provider-response"));
    const response = await handleMpV2Command(request(body)); expect(response.status).toBe(502); expect(await response.text()).not.toContain("sensitive");
  });
});
