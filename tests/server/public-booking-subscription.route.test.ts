import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  business: vi.fn(),
  location: vi.fn(),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessBySlug: mocks.business,
  validateApiKey: (business: { apiKey: string }, key: string | null) => business.apiKey === key,
}));
vi.mock("@/server/services/location.service", () => ({
  getLocationForBusiness: mocks.location,
}));
vi.mock("@/server/lib/rate-limit", () => ({
  bookingLimiter: { check: vi.fn(() => null) },
}));

import { POST } from "@/app/api/business/[slug]/book/route";

function request() {
  return new NextRequest("http://localhost/api/business/demo/book", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": "public-key" },
    body: JSON.stringify({
      serviceId: "service-1",
      customerName: "Diego Test",
      customerEmail: "diego@example.com",
      customerPhone: "+56912345678",
      startTime: "2026-09-20T12:00:00.000Z",
      endTime: "2026-09-20T13:00:00.000Z",
    }),
  });
}

describe("public booking subscription gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.location.mockResolvedValue(null);
  });

  it("rejects an expired trial before any booking operation", async () => {
    mocks.business.mockResolvedValue({
      id: "business-1",
      apiKey: "public-key",
      subscription: {
        plan: "INDIVIDUAL",
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: new Date("2000-01-01T00:00:00.000Z"),
        gracePeriodEndsAt: null,
      },
    });

    const response = await POST(request(), { params: Promise.resolve({ slug: "demo" }) });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "SUBSCRIPTION_INACTIVE" });
    expect(mocks.location).not.toHaveBeenCalled();
  });

  it("lets a current trial pass the subscription gate", async () => {
    mocks.business.mockResolvedValue({
      id: "business-1",
      apiKey: "public-key",
      subscription: {
        plan: "INDIVIDUAL",
        status: "TRIALING",
        isTrial: true,
        trialEndsAt: new Date("2099-01-01T00:00:00.000Z"),
        gracePeriodEndsAt: null,
      },
    });

    const response = await POST(request(), { params: Promise.resolve({ slug: "demo" }) });

    expect(response.status).toBe(400);
    expect(mocks.location).toHaveBeenCalledWith("business-1", undefined);
  });
});
