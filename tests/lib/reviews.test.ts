import { describe, expect, it } from "vitest";
import { canCustomerReviewAppointment, isSubstantialReviewEdit, sanitizeReviewText } from "@/lib/reviews/eligibility";
import { formatPublicReviewerName } from "@/lib/reviews/public-name";
import {
  averageFromSum,
  formatRatingAverage,
  honestAverageDelta,
  isCountablePublicReview,
  isValidReviewRating,
  positiveShare,
} from "@/lib/reviews/rating";
import { REVIEW_AUTO_PUBLISH_DELAY_MS } from "@/lib/reviews/constants";

describe("verified review public identity", () => {
  it("formats a minimal public name without contact data", () => {
    expect(formatPublicReviewerName("Camila Pérez González")).toBe("Camila P.");
    expect(formatPublicReviewerName("ana")).toBe("Ana");
    expect(formatPublicReviewerName("")).toBe("Cliente");
  });
});

describe("review eligibility", () => {
  const now = new Date("2026-09-13T18:00:00.000Z");
  const base = {
    businessId: "biz-1",
    status: "COMPLETED",
    endTime: new Date("2026-09-13T15:00:00.000Z"),
    business: { deletedAt: null },
    verifiedReview: null,
  };

  it("allows a completed past appointment for the same business", () => {
    expect(canCustomerReviewAppointment(base, "biz-1", now)).toEqual({ ok: true, reason: "ok" });
  });

  it("rejects another business, future visits, cancelled and no-show", () => {
    expect(canCustomerReviewAppointment(base, "other", now).reason).toBe("business_mismatch");
    expect(canCustomerReviewAppointment({ ...base, endTime: new Date("2026-09-13T20:00:00.000Z") }, "biz-1", now).reason).toBe("not_ended");
    expect(canCustomerReviewAppointment({ ...base, status: "CANCELLED" }, "biz-1", now).reason).toBe("cancelled");
    expect(canCustomerReviewAppointment({ ...base, status: "NO_SHOW" }, "biz-1", now).reason).toBe("no_show");
    expect(canCustomerReviewAppointment({ ...base, status: "CONFIRMED" }, "biz-1", now).reason).toBe("not_completed");
  });

  it("rejects a second review on the same booking", () => {
    expect(canCustomerReviewAppointment({ ...base, verifiedReview: { id: "rev-1" } }, "biz-1", now).reason).toBe("already_reviewed");
  });
});

describe("public rating math", () => {
  it("never treats an empty marketplace as 0.0 stars", () => {
    expect(averageFromSum(0, 0)).toBeNull();
    expect(formatRatingAverage(null)).toBeNull();
    expect(isValidReviewRating(0)).toBe(false);
    expect(isValidReviewRating(6)).toBe(false);
    expect(isValidReviewRating(5)).toBe(true);
  });

  it("counts only published public reviews", () => {
    expect(isCountablePublicReview({ visibility: "PUBLIC", status: "PUBLISHED", withdrawnAt: null })).toBe(true);
    expect(isCountablePublicReview({ visibility: "PRIVATE", status: "PENDING", withdrawnAt: null })).toBe(false);
    expect(isCountablePublicReview({ visibility: "PUBLIC", status: "PENDING", withdrawnAt: null })).toBe(false);
    expect(isCountablePublicReview({ visibility: "PUBLIC", status: "REPORTED", withdrawnAt: null })).toBe(false);
    expect(isCountablePublicReview({ visibility: "PUBLIC", status: "PUBLISHED", withdrawnAt: new Date() })).toBe(false);
  });

  it("hides comparison deltas without a honest sample", () => {
    expect(honestAverageDelta(4.8, 4.6, 2)).toBeNull();
    expect(honestAverageDelta(4.8, 4.6, 5)).toBe(0.2);
    expect(positiveShare(4, 31, 37)).toBe(95);
  });

  it("centralizes the 72 hour auto-publish delay", () => {
    expect(REVIEW_AUTO_PUBLISH_DELAY_MS).toBe(72 * 60 * 60 * 1000);
  });

  it("sanitizes html out of comments", () => {
    expect(sanitizeReviewText("<script>x</script>Hola", 200)).toBe("xHola");
    expect(isSubstantialReviewEdit({
      previousRating: 5,
      nextRating: 4,
      previousComment: "ok",
      nextComment: "ok",
    })).toBe(true);
  });
});
