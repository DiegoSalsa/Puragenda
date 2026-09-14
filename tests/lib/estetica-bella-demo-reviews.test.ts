import { describe, expect, it } from "vitest";
import { ESTETICA_BELLA_DEMO_SLUG } from "@/lib/marketplace/visibility";
import {
  ESTETICA_BELLA_DEMO_REVIEWS,
  demoAppointmentId,
  demoClientEmail,
  esteticaBellaDemoRatingSummary,
  isEsteticaBellaDemoBusiness,
  publicPublishedDemoReviews,
} from "@/lib/reviews/estetica-bella-demo";

describe("Estética Bella demo review catalog", () => {
  it("targets only the official demo business", () => {
    expect(ESTETICA_BELLA_DEMO_SLUG).toBe("estetica-bella");
    expect(isEsteticaBellaDemoBusiness({ slug: "estetica-bella", name: "Estética Bella" })).toBe(true);
    expect(isEsteticaBellaDemoBusiness({ slug: "soccerbarber", name: "Soccerbarber" })).toBe(false);
    expect(isEsteticaBellaDemoBusiness({ slug: "estetica-bella", name: "Cinnamon Nails" })).toBe(false);
  });

  it("keeps a credible public average between 4.6 and 4.8", () => {
    const summary = esteticaBellaDemoRatingSummary();
    expect(ESTETICA_BELLA_DEMO_REVIEWS.length).toBeGreaterThanOrEqual(20);
    expect(ESTETICA_BELLA_DEMO_REVIEWS.length).toBeLessThanOrEqual(25);
    expect(summary.count).toBe(publicPublishedDemoReviews().length);
    expect(summary.average).toBeGreaterThanOrEqual(4.6);
    expect(summary.average).toBeLessThanOrEqual(4.8);
    expect(summary.distribution[5]).toBeGreaterThan(summary.distribution[4]);
    expect(summary.pending).toBe(1);
    expect(summary.reported).toBe(1);
    expect(summary.private).toBe(1);
    expect(summary.withReply).toBeGreaterThanOrEqual(2);
  });

  it("uses stable unique keys for idempotent upserts", () => {
    const keys = ESTETICA_BELLA_DEMO_REVIEWS.map((review) => review.key);
    const ids = ESTETICA_BELLA_DEMO_REVIEWS.map((review) => demoAppointmentId(review.key));
    const emails = ESTETICA_BELLA_DEMO_REVIEWS.map((review) => demoClientEmail(review.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(emails).size).toBe(emails.length);
    expect(ids.every((id) => id.startsWith("clevrebella"))).toBe(true);
  });
});
