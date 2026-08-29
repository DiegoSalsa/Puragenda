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
});
