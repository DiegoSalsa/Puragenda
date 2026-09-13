import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/security/same-origin", () => ({
  requireSameOrigin: () => null,
}));

vi.mock("@/server/lib/rate-limit", () => ({
  appointmentReviewLimiter: { check: () => null },
}));

vi.mock("@/server/services/client-portal.service", () => ({
  getClientPortalAccountFromRequest: vi.fn(),
}));

vi.mock("@/server/security/review-token", () => ({
  verifyReviewToken: vi.fn(),
}));

vi.mock("@/server/services/reviews.service", () => ({
  submitBookingReview: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { appointment: { findUnique: vi.fn() } },
}));

import { POST } from "@/app/api/reviews/route";
import { getClientPortalAccountFromRequest } from "@/server/services/client-portal.service";
import { verifyReviewToken } from "@/server/security/review-token";
import { submitBookingReview } from "@/server/services/reviews.service";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/reviews", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClientPortalAccountFromRequest).mockResolvedValue(null);
  });

  it("rejects an invalid token without leaking appointment data", async () => {
    vi.mocked(verifyReviewToken).mockReturnValue(null);
    const response = await POST(request({
      token: "a".repeat(24),
      rating: 5,
      visibility: "PRIVATE",
    }));
    expect(response.status).toBe(401);
    expect(submitBookingReview).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Token inválido" });
  });

  it("submits a verified review from a valid token", async () => {
    vi.mocked(verifyReviewToken).mockReturnValue({
      purpose: "verified_review",
      appointmentId: "appt-1",
      businessId: "biz-1",
      exp: Date.now() + 1000,
    });
    vi.mocked(submitBookingReview).mockResolvedValue({
      ok: true,
      review: { visibility: "PUBLIC", status: "PENDING" },
    } as never);
    const response = await POST(request({
      token: "a".repeat(24),
      rating: 5,
      visibility: "PUBLIC",
    }));
    expect(response.status).toBe(200);
    expect(submitBookingReview).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: 5,
      visibility: "PUBLIC",
    }));
  });
});
