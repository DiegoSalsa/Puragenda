import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  MANUAL_TRANSFER_ACCOUNT,
  manualTransferReceiptUrl,
  manualTransferReference,
} from "@/core/manual-transfer";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { ManualTransferPaymentWall } from "@/components/dashboard/manual-transfer-payment-wall";

describe("manual transfer renewal instructions", () => {
  it("shows the contracted amount and every approved account field on the blocked screen", () => {
    const html = renderToStaticMarkup(createElement(ManualTransferPaymentWall, {
      businessName: "Cinnamon nails", businessSlug: "aiko", amountClp: 17990, billingCycle: "MONTHLY",
    }));
    expect(html).toContain("$17.990 CLP");
    expect(html).toContain("Renovación mensual");
    expect(html).toContain("IVA incluido");
    for (const value of Object.values(MANUAL_TRANSFER_ACCOUNT)) expect(html).toContain(value);
    expect(html).toContain("Cinnamon nails / aiko");
    expect(html).toContain("cuando confirmemos la transferencia");
    expect(html).not.toContain("29.990");
    expect(html).not.toContain("Cancelar registro");
    expect(html).not.toContain("Correo de Mercado Pago");
  });

  it("keeps annual renewal amounts labeled as annual", () => {
    const html = renderToStaticMarkup(createElement(ManualTransferPaymentWall, {
      businessName: "Test", businessSlug: "test", amountClp: 179900, billingCycle: "ANNUAL",
    }));
    expect(html).toContain("$179.900 CLP");
    expect(html).toContain("Renovación anual");
    expect(html).not.toContain("Renovación mensual");
  });

  it("addresses receipts to PUROCODE and encodes the business reference as one subject", () => {
    const reference = manualTransferReference("Uñas & Café?", "unas");
    const url = new URL(manualTransferReceiptUrl(reference));
    expect(url.pathname).toBe("contacto@purocode.com");
    expect(url.searchParams.get("subject")).toBe(`Comprobante de renovación Puragenda · ${reference}`);
    expect([...url.searchParams.keys()]).toEqual(["subject"]);
  });
});
