import { describe, expect, it } from "vitest";
import { subscriptionPaymentAdminEmail } from "@/server/email/templates";

describe("subscription payment admin email", () => {
  it("uses the configured business/payment details without emojis", () => {
    const template = subscriptionPaymentAdminEmail({
      businessName: "Cinnamon nails",
      ownerName: "Ana <Owner>",
      ownerEmail: "ana@example.com",
      plan: "EQUIPO",
      billingCycle: "Mensual",
      provider: "Mercado Pago",
      paymentId: "payment-123",
      invoiceId: "invoice-123",
      paymentAt: new Date("2026-09-14T12:00:00.000Z"),
      amountLabel: "$19.990",
      paymentType: "Primer pago",
      firstPayment: true,
      fromTrial: true,
      recovery: false,
    });

    expect(template.subject).toBe("Nueva suscripción pagada — Cinnamon nails");
    expect(template.html).toContain("Cinnamon nails");
    expect(template.html).toContain("payment-123");
    expect(template.html).toContain("Conversión desde prueba");
    expect(template.html).toContain("Ana &lt;Owner&gt;");
    expect(template.subject).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
