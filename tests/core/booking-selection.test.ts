import { describe, expect, it } from "vitest";
import { quoteBookingSelection } from "@/core/booking-selection";
import { bookingFixture } from "../fixtures/booking-catalog";

describe("canonical option selection", () => {
  it("uses major currency units and minute deltas, including home address", () => {
    const result = quoteBookingSelection(bookingFixture().services, ["option-2"]);
    expect(result).toMatchObject({ duration: 90, price: 25000, requiresAddress: true });
    expect(result.selectedOptions[0]).toMatchObject({ serviceId: "service-1", alternativeId: "option-2" });
  });
  it.each([[], ["option-1", "option-2"], ["foreign-option"], ["option-1", "option-1"]].map((options) => ({ options })))("rejects an invalid selection $options", ({ options }) => {
    expect(() => quoteBookingSelection(bookingFixture().services, options)).toThrow();
  });
  it("does not round fractional major units", () => {
    const data = bookingFixture();
    data.services[0].price = 12.75;
    expect(quoteBookingSelection(data.services, ["option-1"]).price).toBe(12.75);
  });
});
