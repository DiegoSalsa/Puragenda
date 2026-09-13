import { describe, expect, it } from "vitest";
import { signBookingFeedbackToken } from "@/server/security/booking-feedback-token";
import { signReviewToken, verifyReviewToken } from "@/server/security/review-token";

describe("verified review token", () => {
  it("signs a token bound to one appointment and business", () => {
    const token = signReviewToken({ appointmentId: "appt-1", businessId: "biz-1", now: 1_000 });
    expect(verifyReviewToken(token, 1_000)).toEqual({
      purpose: "verified_review",
      appointmentId: "appt-1",
      businessId: "biz-1",
      exp: expect.any(Number),
    });
  });

  it("rejects forged, expired and product-feedback tokens", () => {
    const token = signReviewToken({ appointmentId: "appt-1", businessId: "biz-1" });
    expect(verifyReviewToken(`${token}x`)).toBeNull();
    expect(verifyReviewToken("not-a-token")).toBeNull();
    const expired = signReviewToken({ appointmentId: "appt-1", businessId: "biz-1", now: 1_000, ttlMs: 10 });
    expect(verifyReviewToken(expired, 1_011)).toBeNull();
    const product = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    expect(verifyReviewToken(product)).toBeNull();
  });
});
