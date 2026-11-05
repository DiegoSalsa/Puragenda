import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ subscription: vi.fn(), access: vi.fn(), quota: vi.fn(), send: vi.fn(), audience: vi.fn(), tokens: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: vi.fn(async () => ({ id: "owner" })) }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn(async () => ({ id: "business", name: "Synthetic", slug: "synthetic", locale: "es" })) }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: vi.fn(async () => true) }));
vi.mock("@/server/lib/rate-limit", () => ({ marketingLimiter: { check: vi.fn(() => null) } }));
vi.mock("@/server/services/subscription.service", () => ({ getSubscriptionByBusinessId: mocks.subscription }));
vi.mock("@/server/services/commercial-plan-access", () => ({ getCommercialPlanAccess: mocks.access, isV2Plan: (plan: string) => ["PURAGENDA", "PURAGENDA_PLUS"].includes(plan) }));
vi.mock("@/server/services/marketing.service", () => ({ getMarketingLimits: mocks.quota, getCampaignsThisMonth: mocks.quota, getWinBackAudience: mocks.audience, recordCampaign: vi.fn() }));
vi.mock("@/server/email/resend", () => ({ resend: { emails: { send: mocks.send }, batch: { send: mocks.send } } }));
vi.mock("@/server/services/client-portal.service", () => ({ issueClientPortalEmailTokens: mocks.tokens, getClientPortalAppUrl: () => "http://localhost", normalizeClientPortalEmail: (s: string) => s }));
import { POST } from "@/app/api/marketing/send/route";
import { marketingCampaignEmail, withClientPortalAccess } from "@/server/email/templates";
describe("V2 cannot bypass reviewed Contact Flow through legacy marketing", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue({ allowed: true }); });
  it.each(["PURAGENDA", "PURAGENDA_PLUS"])("blocks %s before selecting an audience or invoking Resend", async plan => {
    mocks.subscription.mockResolvedValue({ plan, isTrial: true });
    const response = await POST(new NextRequest("http://localhost/api/marketing/send", { method: "POST", headers: { origin: "http://localhost" }, body: "{}" }));
    expect(response.status).toBe(409); expect(await response.json()).toMatchObject({ code: "CONTACT_FLOW_REQUIRED" });
    expect(mocks.quota).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it("keeps unsafe legacy dispatch paused without selecting recipients or using Resend", async () => {
    mocks.subscription.mockResolvedValue({ plan: "EQUIPO" }); mocks.quota.mockReturnValueOnce(0).mockReturnValueOnce({ maxCampaignsPerMonth: 1, maxEmails: 10 });
    mocks.audience.mockResolvedValue([{ name: "Synthetic", email: "c@synthetic.invalid" }]); mocks.tokens.mockResolvedValue(new Map([["c@synthetic.invalid", "synthetic-auth-token"]]));
    const response = await POST(new NextRequest("http://localhost/api/marketing/send", { method: "POST", headers: { origin: "http://localhost" }, body: JSON.stringify({ subject: "Synthetic", message: "Synthetic" }) }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "LEGACY_MARKETING_REVIEW_REQUIRED" });
    expect(mocks.audience).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.tokens).not.toHaveBeenCalled();
  });
  it("04-03 keeps the legacy commercial template and portal CTA free of authentication credentials", () => {
    const template = withClientPortalAccess(marketingCampaignEmail({ clientName: "Synthetic", businessName: "Synthetic", subject: "Synthetic", body: "Synthetic", widgetUrl: "http://localhost/widget/synthetic" }), "http://localhost/mi-agenda");
    expect(template.html).toContain("/mi-agenda");
    expect(template.html).not.toContain("/mi-agenda/entrar/");
  });
  it("rejects cross-site requests before selecting an audience or invoking Resend", async () => {
    mocks.subscription.mockResolvedValue({ plan: "EQUIPO" });
    const response = await POST(new NextRequest("http://localhost/api/marketing/send", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
      body: JSON.stringify({ subject: "Synthetic", message: "Synthetic" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.audience).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
