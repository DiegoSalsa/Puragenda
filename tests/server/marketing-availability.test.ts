import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ access: vi.fn(), enabled: vi.fn(), context: vi.fn(), scope: vi.fn(), readiness: vi.fn() }));
vi.mock("@/server/services/commercial-plan-access", () => ({ getCommercialPlanAccess: m.access }));
vi.mock("@/server/contact-flow/policy", () => ({ contactLabEnabled: m.enabled }));
vi.mock("@/server/contact-flow/resend-release", () => ({ resendReleaseReadiness: m.readiness }));
vi.mock("@/server/puri/context", () => ({ createPuriContext: m.context }));
vi.mock("@/server/puri/growth/access", () => ({ createGrowthScope: m.scope }));
import { getMarketingAvailability } from "@/server/services/marketing-availability.service";
import { PuriAccessError } from "@/server/puri/types";
describe("08-C1 marketing navigation uses effective commercial and workspace access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.access.mockResolvedValue({ v2: true, allowed: true, has: () => true });
    m.enabled.mockReturnValue(true);
    m.context.mockResolvedValue({ business: { id: "tenant" } });
    m.scope.mockResolvedValue({ canClients: true, canPrepare: true });
    m.readiness.mockReturnValue({ deliveryEnabled: false });
  });
  const read = () => getMarketingAvailability({ id: "owner", role: "ADMIN" }, "tenant");
  it("preserves legacy history without a Plus upsell, workspace or sending grant", async () => {
    m.access.mockResolvedValue({ v2: false, allowed: true, has: () => false });
    expect(await read()).toEqual({ state: "LEGACY_PAUSED", contactFlowHref: null, contactFlowDeliveryEnabled: false });
    expect(m.scope).not.toHaveBeenCalled();
  });
  it.each(["suspended", "expired", "trial ended", "payment missing"])("does not advertise Contact Flow for %s Plus", async () => {
    m.access.mockResolvedValue({ v2: true, allowed: false, has: () => false });
    expect((await read()).state).toBe("SUBSCRIPTION_INACTIVE");
    expect(m.scope).not.toHaveBeenCalled();
  });
  it("explains Basic without offering the legacy form or Contact Flow", async () => {
    m.access.mockResolvedValue({ v2: true, allowed: true, has: () => false });
    expect((await read()).state).toBe("CONTACT_FLOW_NOT_INCLUDED");
  });
  it("does not link a disabled workspace even for paid Plus", async () => {
    m.enabled.mockReturnValue(false);
    expect(await read()).toEqual({ state: "CONTACT_FLOW_DISABLED", contactFlowHref: null, contactFlowDeliveryEnabled: false });
    expect(m.scope).not.toHaveBeenCalled();
  });
  it("offers review for authorized Plus but describes production delivery separately", async () => {
    expect(await read()).toEqual({ state: "CONTACT_FLOW_REVIEW", contactFlowHref: "/dashboard/puri-plus", contactFlowDeliveryEnabled: false });
    expect(m.context).toHaveBeenCalledWith({ id: "owner", role: "ADMIN" }, expect.objectContaining({ businessId: "tenant" }));
  });
  it.each(["canClients", "canPrepare"])("requires %s for the Contact Flow link", async key => {
    m.scope.mockResolvedValue({ canClients: true, canPrepare: true, [key]: false });
    expect((await read()).state).toBe("CONTACT_FLOW_FORBIDDEN");
  });
  it.each(["LOCATION_FORBIDDEN", "FORBIDDEN", "PLUS_ENTITLEMENT_REQUIRED"])("contains effective workspace denial %s", async code => {
    m.scope.mockRejectedValue(new PuriAccessError(code));
    expect((await read()).contactFlowHref).toBeNull();
  });
  it("does not hide unexpected server failures as a commercial denial", async () => {
    m.context.mockRejectedValue(new Error("DATABASE_UNAVAILABLE"));
    await expect(read()).rejects.toThrow("DATABASE_UNAVAILABLE");
  });
});
