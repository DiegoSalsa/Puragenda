import { describe, expect, it } from "vitest";
import { appointmentSettlementSchema } from "@/server/validations/appointment-management";

describe("cierre económico post-sesión", () => {
  it("acepta base, extras, propina y método de pago", () => {
    const result = appointmentSettlementSchema.parse({
      baseAmount: "20000",
      tipAmount: "2500",
      paymentMethod: "CARD",
      items: [{ description: "Servicio adicional", amount: "5000" }],
    });
    expect(result).toMatchObject({ baseAmount: 20000, tipAmount: 2500, paymentMethod: "CARD" });
    expect(result.items[0]?.amount).toBe(5000);
  });

  it("rechaza importes negativos y extras sin descripción", () => {
    expect(appointmentSettlementSchema.safeParse({ baseAmount: -1, items: [] }).success).toBe(false);
    expect(appointmentSettlementSchema.safeParse({ baseAmount: 1, items: [{ description: "", amount: 2 }] }).success).toBe(false);
  });
});
