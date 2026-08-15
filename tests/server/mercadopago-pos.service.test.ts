import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

import {
  calculateAppointmentBalance,
  createMercadoPagoQrOrder,
  mapMercadoPagoOrderStatus,
  PosPaymentError,
  validateMercadoPagoOrder,
} from "@/server/services/mercadopago-pos.service";

describe("Mercado Pago POS service", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("charges only the remainder after deposit and previous POS payments", () => {
    expect(calculateAppointmentBalance({
      totalPrice: 25000,
      depositAmount: 5000,
      approvedPosAmount: 2000,
    })).toBe(18000);
  });

  it("rejects fractional in-person amounts before calling the provider", () => {
    expect(() => calculateAppointmentBalance({
      totalPrice: 10500.5,
      depositAmount: 500,
      approvedPosAmount: 0,
    })).toThrowError(PosPaymentError);
  });

  it.each([
    ["created", "PENDING"],
    ["processed", "APPROVED"],
    ["canceled", "CANCELLED"],
    ["expired", "EXPIRED"],
    ["refunded", "REFUNDED"],
  ])("maps Mercado Pago order status %s to %s", (providerStatus, expected) => {
    expect(mapMercadoPagoOrderStatus({ status: providerStatus })).toBe(expected);
  });

  it("creates a dynamic QR order with idempotency and no customer PII", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "ORD00001111222233334444555566",
      user_id: "seller-1",
      type: "qr",
      external_reference: "pos_reference",
      total_amount: "15000",
      currency: "CLP",
      status: "created",
      status_detail: "created",
      type_response: { qr_data: "000201010212-test" },
      transactions: { payments: [{ id: "PAY-1", amount: "15000" }] },
    }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const order = await createMercadoPagoQrOrder({
      accessToken: "secret-token",
      amount: 15000,
      externalReference: "pos_reference",
      idempotencyKey: "idem-1",
    });

    expect(order.type_response?.qr_data).toBe("000201010212-test");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
          "X-Idempotency-Key": "idem-1",
        }),
      }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({
      type: "qr",
      total_amount: "15000",
      description: "Saldo de reserva Puragenda",
      external_reference: "pos_reference",
      expiration_time: "PT15M",
      config: { qr: { mode: "dynamic" } },
      transactions: { payments: [{ amount: "15000" }] },
    });
  });

  it("rejects an order whose seller, amount or reference does not match", () => {
    expect(() => validateMercadoPagoOrder({
      order: {
        id: "ORD-1",
        user_id: "attacker",
        type: "qr",
        external_reference: "pos_other",
        total_amount: "1",
        currency: "CLP",
        transactions: { payments: [{ amount: "1" }] },
      },
      providerOrderId: "ORD-1",
      providerUserId: "seller-1",
      externalReference: "pos_expected",
      amount: 15000,
      currency: "CLP",
    })).toThrowError(/no coincide/i);
  });
});
