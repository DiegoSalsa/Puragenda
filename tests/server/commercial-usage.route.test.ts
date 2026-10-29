import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), business: vi.fn(), usage: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: mocks.user }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: mocks.business }));
vi.mock("@/server/services/commercial-usage-summary", () => ({ getCommercialUsageSummary: mocks.usage }));
import { GET } from "@/app/api/dashboard/usage/route";
describe("commercial consumption authorization", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "actor-a" }); mocks.business.mockResolvedValue({ id: "business-a", deletedAt: null }); mocks.usage.mockResolvedValue({ active: true, items: [] }); });
  it("uses server membership and ignores a forged business query", async () => {
    const response = await GET(new NextRequest("http://localhost/api/dashboard/usage?businessId=business-b"));
    expect(response.status).toBe(200); expect(mocks.business).toHaveBeenCalledWith("actor-a"); expect(mocks.usage).toHaveBeenCalledWith("business-a"); expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("does not read usage for an unauthenticated actor or deleted business", async () => {
    mocks.user.mockResolvedValue(null); expect((await GET(new NextRequest("http://localhost/api/dashboard/usage"))).status).toBe(401);
    expect(mocks.usage).not.toHaveBeenCalled(); mocks.user.mockResolvedValue({ id: "actor-a" }); mocks.business.mockResolvedValue({ id: "deleted", deletedAt: new Date() });
    expect((await GET(new NextRequest("http://localhost/api/dashboard/usage"))).status).toBe(404); expect(mocks.usage).not.toHaveBeenCalled();
  });
});
