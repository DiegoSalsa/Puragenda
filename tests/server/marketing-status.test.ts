import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ user: vi.fn(), business: vi.fn(), permission: vi.fn(), subscription: vi.fn(), availability: vi.fn(), limits: vi.fn(), count: vi.fn(), last: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: m.user }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: m.business }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: m.permission }));
vi.mock("@/server/services/subscription.service", () => ({ getSubscriptionByBusinessId: m.subscription }));
vi.mock("@/server/services/marketing-availability.service", () => ({ getMarketingAvailability: m.availability }));
vi.mock("@/server/services/marketing.service", () => ({ getMarketingLimits: m.limits, getCampaignsThisMonth: m.count, getLastCampaign: m.last }));
import { GET } from "@/app/api/marketing/status/route";
describe("08-C1 status preserves old readers and exposes an unalterable legacy pause", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.user.mockResolvedValue({ id: "owner" }); m.business.mockResolvedValue({ id: "tenant" }); m.permission.mockResolvedValue(true);
    m.subscription.mockResolvedValue({ plan: "EQUIPO", isTrial: false });
    m.availability.mockResolvedValue({ state: "LEGACY_PAUSED", contactFlowHref: null, contactFlowDeliveryEnabled: false });
    m.limits.mockReturnValue({ maxCampaignsPerMonth: 4, maxEmails: 100 }); m.count.mockResolvedValue(2);
    m.last.mockResolvedValue({ subject: "Historical synthetic", audienceSize: 9, sentAt: new Date("2026-01-01T00:00:00Z") });
  });
  const get = () => GET(new NextRequest("http://localhost/api/marketing/status?sendingEnabled=true&legacySendingPaused=false"));
  it("retains field types/history but never advertises usable legacy capacity", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ campaignsSentThisMonth: 2, maxCampaignsPerMonth: 0, maxAudienceSize: 0, plan: "EQUIPO", lastCampaign: { subject: "Historical synthetic", audienceSize: 9, sentAt: "2026-01-01T00:00:00.000Z" }, legacySendingPaused: true, sendingEnabled: false });
    expect(m.limits).not.toHaveBeenCalled();
  });
  it.each(["PURAGENDA", "PURAGENDA_PLUS"])("does not leak Contact Flow capacity through old fields for %s", async plan => {
    m.subscription.mockResolvedValue({ plan });
    m.availability.mockResolvedValue({ state: "CONTACT_FLOW_REVIEW", contactFlowHref: "/dashboard/puri-plus", contactFlowDeliveryEnabled: false });
    expect(await (await get()).json()).toMatchObject({ plan, maxCampaignsPerMonth: 0, maxAudienceSize: 0, sendingEnabled: false });
  });
  it("preserves empty history", async () => { m.last.mockResolvedValue(null); expect((await (await get()).json()).lastCampaign).toBeNull(); });
  it.each([401, 403, 404])("denies %s before exposing commercial or historical data", async code => {
    if (code === 401) m.user.mockResolvedValue(null);
    if (code === 403) m.permission.mockResolvedValue(false);
    if (code === 404) m.business.mockResolvedValue(null);
    expect((await get()).status).toBe(code); expect(m.last).not.toHaveBeenCalled(); expect(m.availability).not.toHaveBeenCalled();
  });
});
