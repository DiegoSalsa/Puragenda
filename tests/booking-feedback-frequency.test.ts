import { describe, expect, it } from "vitest";
import {
  BOOKING_FEEDBACK_COOLDOWN_MS,
  GOOGLE_REVIEW_CTA_COOLDOWN_MS,
} from "@/lib/booking-feedback/constants";
import {
  parseBookingFeedbackFrequencyState,
  shouldAskForBookingFeedback,
  shouldShowGoogleReviewCta,
  shouldShowPostBookingFeedback,
} from "@/lib/booking-feedback/frequency";

describe("booking feedback frequency", () => {
  it("asks at most once every 30 days after a response", () => {
    const now = 1_000_000;
    expect(shouldAskForBookingFeedback({}, now)).toBe(true);
    expect(shouldAskForBookingFeedback({ lastFeedbackAt: now - BOOKING_FEEDBACK_COOLDOWN_MS + 1 }, now)).toBe(false);
    expect(shouldAskForBookingFeedback({ lastFeedbackAt: now - BOOKING_FEEDBACK_COOLDOWN_MS }, now)).toBe(true);
  });

  it("hides the Google CTA for 180 days after a click", () => {
    const now = 1_000_000;
    expect(shouldShowGoogleReviewCta({ googleClickedAt: now }, now)).toBe(false);
    expect(shouldShowGoogleReviewCta({ googleClickedAt: now - GOOGLE_REVIEW_CTA_COOLDOWN_MS }, now)).toBe(true);
  });

  it("parses stored localStorage payloads without throwing", () => {
    expect(parseBookingFeedbackFrequencyState("not-json")).toEqual({});
    expect(parseBookingFeedbackFrequencyState('{"lastFeedbackAt":123,"googleClickedAt":456}')).toEqual({
      lastFeedbackAt: 123,
      googleClickedAt: 456,
    });
  });

  it("still shows the prompt when Google is on cooldown but the 30-day window expired", () => {
    const now = Date.now();
    expect(shouldShowPostBookingFeedback({
      previewMode: false,
      hasFeedbackToken: true,
      isRecurringSuccess: false,
      now,
      frequency: {
        lastFeedbackAt: now - BOOKING_FEEDBACK_COOLDOWN_MS,
        googleClickedAt: now - 10,
      },
    })).toEqual({ showPrompt: true, showGoogleCta: false });
  });
});
