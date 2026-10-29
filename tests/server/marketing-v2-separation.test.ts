import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ subscription: vi.fn(), access: vi.fn(), quota: vi.fn(), send: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: vi.fn(async () => ({ id: "owner" })) }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn(async () => ({ id: "business" })) }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: vi.fn(async () => true) }));
vi.mock("@/server/lib/rate-limit", () => ({ marketingLimiter: { check: vi.fn(() => null) } }));
vi.mock("@/server/services/subscription.service", () => ({ getSubscriptionByBusinessId: mocks.subscription }));
vi.mock("@/server/services/commercial-plan-access", () => ({ getCommercialPlanAccess: mocks.access, isV2Plan: (plan: string) => ["PURAGENDA", "PURAGENDA_PLUS"].includes(plan) }));
vi.mock("@/server/services/marketing.service", () => ({ getMarketingLimits: mocks.quota, getCampaignsThisMonth: mocks.quota, getWinBackAudience: vi.fn(), recordCampaign: vi.fn() }));
vi.mock("@/server/email/resend", () => ({ resend: { emails: { send: mocks.send } } }));
import { POST } from "@/app/api/marketing/send/route";
describe("V2 cannot bypass reviewed Contact Flow through legacy marketing", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ allowed: true }); });
  it.each(["PURAGENDA", "PURAGENDA_PLUS"])("blocks %s before selecting an audience or invoking Resend", async plan => {
    mocks.subscription.mockResolvedValue({ plan, isTrial: true });
    const response = await POST(new NextRequest("http://localhost/api/marketing/send", { method: "POST", body: "{}" }));
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: "CONTACT_FLOW_REQUIRED" });
    expect(mocks.quota).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
});
