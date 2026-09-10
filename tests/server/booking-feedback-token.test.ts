import { describe, expect, it } from "vitest";
import { signBookingFeedbackToken, verifyBookingFeedbackToken } from "@/server/security/booking-feedback-token";

describe("booking feedback token", () => {
  it("signs a token bound to one appointment and business", () => {
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1", now: 1_000 });
    expect(verifyBookingFeedbackToken(token, 1_000)).toEqual({
      appointmentId: "appt-1",
      businessId: "biz-1",
      exp: expect.any(Number),
    });
  });

  it("rejects a forged token and a token for another appointment", () => {
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    expect(verifyBookingFeedbackToken(`${token}x`)).toBeNull();
    expect(verifyBookingFeedbackToken("not-a-token")).toBeNull();
    const other = signBookingFeedbackToken({ appointmentId: "appt-2", businessId: "biz-1" });
    expect(verifyBookingFeedbackToken(other)?.appointmentId).toBe("appt-2");
    expect(verifyBookingFeedbackToken(other)?.appointmentId).not.toBe("appt-1");
  });

  it("rejects expired tokens", () => {
    const token = signBookingFeedbackToken({
      appointmentId: "appt-1",
      businessId: "biz-1",
      now: 1_000,
      ttlMs: 10,
    });
    expect(verifyBookingFeedbackToken(token, 1_011)).toBeNull();
  });
});
