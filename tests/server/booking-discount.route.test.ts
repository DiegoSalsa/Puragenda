import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  business: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessBySlug: mocks.business,
  validateApiKey: (business: { apiKey: string }, key: string | undefined) => business.apiKey === key,
}));
vi.mock("@/server/services/booking-discount.service", () => ({ resolveBookingDiscount: mocks.resolve }));

import { POST } from "@/app/api/business/[slug]/validate-discount/route";

function request(body: unknown, apiKey = "public-key") {
  return new NextRequest("http://localhost/api/business/demo/validate-discount", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(body),
  });
}

describe("validate booking discount route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.business.mockResolvedValue({ id: "business-1", apiKey: "public-key" });
    mocks.resolve.mockResolvedValue({
      discount: { id: "code-1" },
      quote: {
        codeId: "code-1",
        code: "SUMMER10",
        discountType: "PERCENTAGE",
        discountValue: 10,
        originalTotal: 20_000,
        discountAmount: 2_000,
        discountedTotal: 18_000,
      },
    });
  });

  it("requires the widget API key", async () => {
    const response = await POST(request({ code: "SUMMER10", subtotal: 20_000 }, "wrong"), { params: Promise.resolve({ slug: "demo" }) });

    expect(response.status).toBe(401);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it("returns a scoped server quote for the widget", async () => {
    const response = await POST(request({ code: "SUMMER10", subtotal: 20_000 }), { params: Promise.resolve({ slug: "demo" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ valid: true, discountedTotal: 18_000 });
    expect(mocks.resolve).toHaveBeenCalledWith({ code: "SUMMER10", businessId: "business-1", subtotal: 20_000 });
  });
});
