import { describe, expect, it } from "vitest";
import { serviceSchema } from "@/server/validations/booking";

const baseService = {
  name: "Lifting",
  description: "",
  duration: 60,
  price: 20000,
  depositAmount: 5000,
  bookingMode: "APPOINTMENT",
};

describe("service deposit payment link validation", () => {
  it("accepts an HTTPS Mercado Pago payment link", () => {
    const result = serviceSchema.safeParse({
      ...baseService,
      depositPaymentUrl: "https://link.mercadopago.com.ar/lottyskin-abono",
    });

    expect(result.success).toBe(true);
  });

  it("normalizes an empty payment link to null", () => {
    const result = serviceSchema.parse({ ...baseService, depositPaymentUrl: "" });

    expect(result.depositPaymentUrl).toBeNull();
  });

  it("rejects non-HTTPS payment links", () => {
    const result = serviceSchema.safeParse({
      ...baseService,
      depositPaymentUrl: "http://example.test/abono",
    });

    expect(result.success).toBe(false);
  });
});
