import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

import {
  calculateAppointmentBalance,
  createMercadoPagoCheckoutPreference,
  createMercadoPagoQrOrder,
  isMercadoPagoCheckoutPreferenceId,
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
      externalPosId: "PURAGENDAseller1POS1",
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
      config: { qr: { external_pos_id: "PURAGENDAseller1POS1", mode: "dynamic" } },
      transactions: { payments: [{ amount: "15000" }] },
    });
  });

  it("turns provider authorization failures into a reconnect instruction", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: "At least one policy returned UNAUTHORIZED." }),
      { status: 401, headers: { "content-type": "application/json" } },
    )));

    await expect(createMercadoPagoQrOrder({
      accessToken: "invalid-token",
      amount: 15000,
      externalReference: "pos_test",
      idempotencyKey: "idem-test",
      externalPosId: "PURAGENDAseller1POS1",
    })).rejects.toMatchObject({
      message: "La conexión con Mercado Pago no está autorizada. Vuelve a conectar la cuenta del negocio.",
      code: "MERCADOPAGO_ORDER_FAILED",
    });
  });

  it("creates an expiring Checkout preference that can be encoded as QR fallback", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "seller-1-preference-1",
      init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=test",
      collector_id: "seller-1",
      external_reference: "pos_reference",
    }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const expiresAt = new Date("2026-08-15T16:15:00.000Z");
    const preference = await createMercadoPagoCheckoutPreference({
      accessToken: "secret-token",
      amount: 15000,
      currency: "CLP",
      externalReference: "pos_reference",
      idempotencyKey: "idem-1",
      expiresAt,
    });

    expect(preference.init_point).toContain("mercadopago.cl");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      external_reference: "pos_reference",
      expires: true,
      expiration_date_to: expiresAt.toISOString(),
      items: [{ unit_price: 15000, currency_id: "CLP", quantity: 1 }],
    });
  });

  it("keeps Checkout preferences distinguishable after their payment status changes", () => {
    expect(isMercadoPagoCheckoutPreferenceId("786219474-preference-id")).toBe(true);
    expect(isMercadoPagoCheckoutPreferenceId("ORD00001111222233334444555566")).toBe(false);
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
