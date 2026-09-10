import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("booking feedback isolation and success-screen safety", () => {
  it("issues a feedback token from booking without persisting feedback in the same request", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/business/[slug]/book/route.ts"), "utf8");
    expect(source).toContain("signBookingFeedbackToken");
    expect(source).toContain("feedbackToken");
    expect(source).not.toContain("upsertBookingFeedback");
  });

  it("keeps widget success independent from the feedback request", () => {
    const widget = readFileSync(join(process.cwd(), "src/app/widget/[slug]/widget-client.tsx"), "utf8");
    expect(widget).toContain("setFeedbackToken");
    expect(widget).toContain("setStep(\"success\")");
    expect(widget).toContain("<BookingFeedbackCard");
    const successIndex = widget.lastIndexOf("step === \"success\"");
    const feedbackIndex = widget.indexOf("<BookingFeedbackCard");
    const activationIndex = widget.indexOf("No vuelvas a completar tus datos");
    const bookAnotherIndex = widget.indexOf("t(\"bookAnother\")");
    expect(feedbackIndex).toBeGreaterThan(successIndex);
    expect(activationIndex).toBeGreaterThan(feedbackIndex);
    expect(bookAnotherIndex).toBeGreaterThan(activationIndex);
    expect(widget).not.toContain("g.page/r/CZcC65S2yDolEAI/review");
  });

  it("treats feedback persistence as best-effort in the widget card", () => {
    const source = readFileSync(join(process.cwd(), "src/components/widget/booking-feedback-card.tsx"), "utf8");
    expect(source).toContain("Best-effort");
    expect(source).toContain("catch {");
    expect(source).toContain("google_review_cta_shown");
    expect(source).toContain("phase === \"improve\" ? googleCtaImprove : googleCtaPositive");
  });

  it("does not add feedback to the business dashboard", () => {
    expect(existsSync(join(process.cwd(), "src/app/dashboard/feedback"))).toBe(false);
    const sidebar = readFileSync(join(process.cwd(), "src/components/dashboard/sidebar.tsx"), "utf8");
    expect(sidebar).not.toMatch(/Feedback de reservas/);
  });
});
