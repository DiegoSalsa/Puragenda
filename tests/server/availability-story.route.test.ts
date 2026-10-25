import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ user: vi.fn(), business: vi.fn(), build: vi.fn(), campaign: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: mocks.user }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: mocks.business }));
vi.mock("@/server/services/availability-story.service", () => ({ buildAvailabilityStory: mocks.build, recordAvailabilityStoryCampaign: mocks.campaign }));
vi.mock("@/server/lib/rate-limit", () => ({ availabilityStoryLimiter: { check: () => null } }));
import { POST } from "@/app/api/dashboard/stories/route";

const body = { locationId: "location", allServices: true, range: "NEXT_AVAILABLE", template: "AURORA", accentColor: "#7C3AED", secondaryColor: "#FF4F87", canvasColor: "#FFFFFF", storyTextColor: "#171717" };
const request = (value = body, publish = false) => new NextRequest(`http://localhost/api/dashboard/stories${publish ? "?publish=1" : ""}`, {
  method: "POST", body: JSON.stringify(value), headers: { "Content-Type": "application/json" },
});
describe("story generation endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "user", role: "ADMIN" });
    mocks.business.mockResolvedValue({ id: "business" });
    mocks.build.mockResolvedValue({ bookingUrl: "http://localhost/widget/demo", showSchedule: true, days: [] });
  });
  it("requires authentication before building stories", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.build).not.toHaveBeenCalled();
  });
  it("rejects invalid configurations before querying availability", async () => {
    expect((await POST(request({ ...body, accentColor: "invalid" }))).status).toBe(400);
    expect(mocks.build).not.toHaveBeenCalled();
  });
  it.each(["STORY_DATE_FORBIDDEN", "STORY_DATES_EMPTY"])("returns actionable input errors for %s", async reason => {
    mocks.build.mockRejectedValue(new Error(reason));
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("fechas válidas");
  });
  it("keeps staff scope denials as forbidden", async () => {
    mocks.build.mockRejectedValue(new Error("STORY_STAFF_SCOPE_FORBIDDEN"));
    expect((await POST(request())).status).toBe(403);
  });
  it("does not create campaigns for previews and disables caching", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.campaign).not.toHaveBeenCalled();
  });
  it("uses the campaign link when publishing", async () => {
    mocks.campaign.mockResolvedValue({ campaignId: "campaign", bookingUrl: "http://localhost/s/campaign" });
    const response = await POST(request(body, true));
    expect(await response.json()).toMatchObject({ campaignId: "campaign", data: { bookingUrl: "http://localhost/s/campaign" } });
  });
});
