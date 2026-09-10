import { describe, expect, it } from "vitest";
import { isTrackingEvent, sanitizeTrackingProperties } from "@/lib/analytics/events";

describe("tracking event privacy controls", () => {
  it("only permits known tracking event names", () => {
    expect(isTrackingEvent("booking_created")).toBe(true);
    expect(isTrackingEvent("customer_email_captured")).toBe(false);
  });

  it("drops values that are not explicitly safe for the event", () => {
    const properties = sanitizeTrackingProperties("booking_created", {
      has_deposit: true,
      service_count: 2,
      customerEmail: "cliente@example.com",
      phone: "+56912345678",
      customerName: "Cliente privado",
      payment_required: false,
    });

    expect(properties).toEqual({
      has_deposit: true,
      service_count: 2,
      payment_required: false,
    });
  });

  it("limits free text properties to a safe length", () => {
    const properties = sanitizeTrackingProperties("booking_failed", {
      reason: "x".repeat(250),
      stage: "submit",
    });

    expect(properties.reason).toHaveLength(120);
    expect(properties.stage).toBe("submit");
  });

  it("keeps campaign attribution but drops contact details from lead events", () => {
    const properties = sanitizeTrackingProperties("contact_lead_submitted", {
      placement: "contact_form",
      landing_path: "/alternativa-agendapro",
      first_utm_source: "google",
      first_utm_campaign: "reservas_chile",
      email: "cliente@example.com",
      message: "Necesito una demostración",
    });

    expect(properties).toEqual({
      placement: "contact_form",
      landing_path: "/alternativa-agendapro",
      first_utm_source: "google",
      first_utm_campaign: "reservas_chile",
    });
  });

  it("allows booking feedback funnel events without PII or comment text", () => {
    expect(isTrackingEvent("booking_feedback_shown")).toBe(true);
    expect(isTrackingEvent("booking_feedback_positive")).toBe(true);
    expect(isTrackingEvent("booking_feedback_improve")).toBe(true);
    expect(isTrackingEvent("booking_feedback_comment_submitted")).toBe(true);
    expect(isTrackingEvent("google_review_cta_shown")).toBe(true);
    expect(isTrackingEvent("google_review_cta_clicked")).toBe(true);

    const properties = sanitizeTrackingProperties("booking_feedback_comment_submitted", {
      source: "booking_success",
      rating: "improve",
      authenticated: false,
      email: "cliente@example.com",
      phone: "+56912345678",
      customerName: "Ana",
      comment: "Me costó encontrar al profesional",
    });

    expect(properties).toEqual({
      source: "booking_success",
      rating: "improve",
      authenticated: false,
    });
  });

  it("allows only the selected launch feature on changelog CTA events", () => {
    expect(isTrackingEvent("changelog_launch_viewed")).toBe(true);
    expect(sanitizeTrackingProperties("changelog_launch_cta_clicked", {
      feature: "gift_cards",
      email: "private@example.com",
    })).toEqual({ feature: "gift_cards" });
  });
});
