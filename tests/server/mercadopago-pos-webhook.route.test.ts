import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateSignature: vi.fn(),
  findPayment: vi.fn(),
  getAccessToken: vi.fn(),
  getOrder: vi.fn(),
  syncPayment: vi.fn(),
}));

vi.mock("mercadopago", () => {
  class InvalidWebhookSignatureError extends Error {}
  return {
    InvalidWebhookSignatureError,
    WebhookSignatureValidator: { validate: mocks.validateSignature },
  };
});
vi.mock("@/server/db/prisma", () => ({
  prisma: { posPayment: { findUnique: mocks.findPayment } },
}));
vi.mock("@/server/services/mercadopago-oauth.service", () => ({
  getValidMercadoPagoAccessToken: mocks.getAccessToken,
}));
vi.mock("@/server/services/mercadopago-pos.service", () => ({
  PosPaymentError: class PosPaymentError extends Error {},
  getMercadoPagoOrder: mocks.getOrder,
  syncPosPaymentFromOrder: mocks.syncPayment,
}));

import { POST } from "@/app/api/webhooks/mercadopago-orders/route";

function request() {
  return new Request("http://localhost/api/webhooks/mercadopago-orders?data.id=ORD-1", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": "request-1",
      "x-signature": "ts=1,v1=test",
    },
    body: JSON.stringify({ type: "order", data: { id: "ORD-1" } }),
  });
}

describe("Mercado Pago Orders webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "test-webhook-secret");
    mocks.findPayment.mockResolvedValue({ id: "pos-1", businessId: "business-1" });
    mocks.getAccessToken.mockResolvedValue("seller-token");
    mocks.getOrder.mockResolvedValue({ id: "ORD-1", status: "processed" });
    mocks.syncPayment.mockResolvedValue({ id: "pos-1", status: "APPROVED" });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when the webhook secret is missing", async () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(mocks.findPayment).not.toHaveBeenCalled();
  });

  it("validates the signature and fetches the authoritative order before updating", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.validateSignature).toHaveBeenCalledWith(expect.objectContaining({
      dataId: "ORD-1",
      secret: "test-webhook-secret",
      toleranceSeconds: 300,
    }));
    expect(mocks.getOrder).toHaveBeenCalledWith("seller-token", "ORD-1");
    expect(mocks.syncPayment).toHaveBeenCalledWith("pos-1", { id: "ORD-1", status: "processed" });
  });

  it("acknowledges unknown orders without attempting a provider lookup", async () => {
    mocks.findPayment.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.getOrder).not.toHaveBeenCalled();
  });
});
