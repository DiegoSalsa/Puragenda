import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  business: vi.fn(),
  agendaScope: vi.fn(),
  permissions: vi.fn(),
  getAccessToken: vi.fn(),
  createOrder: vi.fn(),
  createCheckoutPreference: vi.fn(),
  validateOrder: vi.fn(),
  appointmentFindFirst: vi.fn(),
  paymentUpdateMany: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentCreate: vi.fn(),
  paymentUpdate: vi.fn(),
}));

vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: mocks.session }));
vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: mocks.business,
  getStaffAgendaScope: mocks.agendaScope,
}));
vi.mock("@/server/services/permissions.service", () => ({
  getEffectiveBusinessPermissions: mocks.permissions,
}));
vi.mock("@/server/services/mercadopago-oauth.service", () => ({
  getValidMercadoPagoAccessToken: mocks.getAccessToken,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: { findFirst: mocks.appointmentFindFirst },
    posPayment: {
      updateMany: mocks.paymentUpdateMany,
      findFirst: mocks.paymentFindFirst,
      create: mocks.paymentCreate,
      update: mocks.paymentUpdate,
    },
  },
}));
vi.mock("@/server/services/mercadopago-pos.service", async () => {
  const actual = await vi.importActual<typeof import("@/server/services/mercadopago-pos.service")>(
    "@/server/services/mercadopago-pos.service",
  );
  return {
    ...actual,
    createMercadoPagoQrOrder: mocks.createOrder,
    createMercadoPagoCheckoutPreference: mocks.createCheckoutPreference,
    validateMercadoPagoOrder: mocks.validateOrder,
    newPosProviderIdentifiers: () => ({ externalReference: "pos_test", idempotencyKey: "idem-test" }),
    posQrExpiresAt: () => new Date("2026-08-15T16:15:00.000Z"),
  };
});

import { POST } from "@/app/api/dashboard/pos/qr/route";

const appointmentId = "clx123456789012345678901";

function request() {
  return new NextRequest("http://localhost/api/dashboard/pos/qr", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appointmentId }),
  });
}

describe("dashboard POS QR route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: "user-1", role: "ADMIN" });
    mocks.business.mockResolvedValue({
      id: "business-1",
      ownerId: "user-1",
      depositRequired: true,
      depositPaymentMode: "MERCADOPAGO",
      mpAccessToken: "stored-token",
      mpUserId: "seller-1",
      currencyCode: "CLP",
    });
    mocks.permissions.mockResolvedValue(["appointments.manage_all"]);
    mocks.agendaScope.mockResolvedValue({ ownStaffId: null });
    mocks.appointmentFindFirst.mockResolvedValue({
      id: appointmentId,
      staffId: "staff-1",
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
      depositAmount: 5000,
      totalPrice: 20000,
      service: { price: 20000 },
      posPayments: [],
    });
    mocks.paymentUpdateMany.mockResolvedValue({ count: 0 });
    mocks.paymentFindFirst.mockResolvedValue(null);
    mocks.paymentCreate.mockResolvedValue({ id: "pos-payment-1" });
    mocks.getAccessToken.mockResolvedValue("fresh-token");
    mocks.createOrder.mockResolvedValue({
      id: "ORD00001111222233334444555566",
      user_id: "seller-1",
      type: "qr",
      external_reference: "pos_test",
      total_amount: "15000",
      currency: "CLP",
      status: "created",
      status_detail: "created",
      type_response: { qr_data: "000201010212-test" },
      transactions: { payments: [{ id: "PAY-1", amount: "15000" }] },
    });
    mocks.paymentUpdate.mockResolvedValue({
      id: "pos-payment-1",
      amount: 15000,
      currency: "CLP",
      status: "PENDING",
      statusDetail: "created",
      qrData: "000201010212-test",
      expiresAt: new Date("2026-08-15T16:15:00.000Z"),
    });
  });

  it("requires authentication", async () => {
    mocks.session.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("requires an approved deposit", async () => {
    mocks.appointmentFindFirst.mockResolvedValue({
      ...(await mocks.appointmentFindFirst()),
      paymentStatus: "PENDING",
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("creates a QR only for the remaining appointment balance", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ id: "pos-payment-1", amount: 15000, currency: "CLP", status: "PENDING" });
    expect(body.qrImageDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(mocks.createOrder).toHaveBeenCalledWith({
      accessToken: "fresh-token",
      amount: 15000,
      externalReference: "pos_test",
      idempotencyKey: "idem-test",
      externalPosId: "PURAGENDAseller1POS1",
    });
    expect(mocks.validateOrder).toHaveBeenCalled();
  });

  it("falls back to a Mercado Pago Checkout QR when native QR orders are not authorized", async () => {
    const { PosPaymentError } = await import("@/server/services/mercadopago-pos.service");
    mocks.createOrder.mockRejectedValueOnce(new PosPaymentError(
      "QR no autorizado",
      409,
      "MERCADOPAGO_ORDER_FAILED",
      403,
    ));
    mocks.createCheckoutPreference.mockResolvedValueOnce({
      id: "seller-1-preference-1",
      init_point: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=test",
      collector_id: "seller-1",
    });

    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.createCheckoutPreference).toHaveBeenCalledWith(expect.objectContaining({
      amount: 15000,
      currency: "CLP",
      externalReference: "pos_test",
    }));
    expect(mocks.paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "PENDING",
        providerOrderId: "seller-1-preference-1",
        qrData: expect.stringContaining("mercadopago.cl"),
        statusDetail: "checkout_preference",
      }),
    }));
  });
});
