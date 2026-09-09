import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mp = vi.hoisted(() => {
  class InvalidWebhookSignatureError extends Error {}
  return { validate: vi.fn(), InvalidWebhookSignatureError };
});
const db = vi.hoisted(() => ({
  giftCardPurchase: { findUnique: vi.fn(), updateMany: vi.fn() },
  giftCard: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  InvalidWebhookSignatureError: mp.InvalidWebhookSignatureError,
  WebhookSignatureValidator: { validate: mp.validate },
}));
vi.mock("@/server/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/services/mercadopago-oauth.service", () => ({ getValidMercadoPagoAccessToken: vi.fn() }));
vi.mock("@/server/services/gift-card.service", () => ({ issueGiftCardForPurchase: vi.fn() }));
vi.mock("@/server/email/gift-card", () => ({ sendGiftCardEmail: vi.fn() }));

import { POST } from "@/app/api/webhooks/gift-cards/route";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import { issueGiftCardForPurchase } from "@/server/services/gift-card.service";
import { sendGiftCardEmail } from "@/server/email/gift-card";

const accessToken = vi.mocked(getValidMercadoPagoAccessToken);
const issue = vi.mocked(issueGiftCardForPurchase);
const sendEmail = vi.mocked(sendGiftCardEmail);

function request(businessId = "business-1") {
  return new NextRequest(`http://localhost/api/webhooks/gift-cards?businessId=${businessId}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "request-1", "x-signature": "ts=1,v1=test" },
    body: JSON.stringify({ type: "payment", data: { id: "payment-1" } }),
  });
}

function payment(status: string) {
  return { status, external_reference: "purchase-1", transaction_amount: 45_000, currency_id: "CLP" };
}

describe("Gift Card Mercado Pago webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "secret");
    accessToken.mockResolvedValue("seller-token");
    db.giftCardPurchase.findUnique.mockResolvedValue({ id: "purchase-1", businessId: "business-1", salePrice: 45_000, currencyCode: "CLP", paymentStatus: "PENDING" });
    db.giftCardPurchase.updateMany.mockResolvedValue({ count: 1 });
    db.giftCard.findUnique.mockResolvedValue({ deliveryEmailSentAt: null });
    issue.mockResolvedValue({ created: true, giftCard: { id: "card-1" } } as never);
    db.$transaction.mockImplementation(async (callback) => callback(db));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payment("approved") }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails closed without a signature secret", async () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    expect(accessToken).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature", async () => {
    mp.validate.mockImplementationOnce(() => { throw new mp.InvalidWebhookSignatureError(); });
    expect((await POST(request())).status).toBe(401);
    expect(accessToken).not.toHaveBeenCalled();
  });

  it("issues exactly one card for an approved seller payment", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(issue).toHaveBeenCalledTimes(1);
    expect(issue).toHaveBeenCalledWith("purchase-1", db);
    expect(sendEmail).toHaveBeenCalledWith("card-1");
  });

  it("does not issue a second card for a duplicate webhook", async () => {
    db.giftCardPurchase.updateMany.mockResolvedValue({ count: 0 });
    db.giftCard.findUnique
      .mockResolvedValueOnce({ id: "card-1" })
      .mockResolvedValueOnce({ deliveryEmailSentAt: new Date() });
    await POST(request());
    expect(issue).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does not issue for a rejected payment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payment("rejected") }));
    await POST(request());
    expect(issue).not.toHaveBeenCalled();
    expect(db.giftCardPurchase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentStatus: "FAILED" }) }));
  });

  it("does not accept a payment for a different business", async () => {
    await POST(request("business-2"));
    expect(issue).not.toHaveBeenCalled();
  });

  it.each([
    { transaction_amount: 1, currency_id: "CLP" },
    { transaction_amount: 45_000, currency_id: "USD" },
  ])("does not issue when canonical amount or currency mismatches", async (mismatch) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...payment("approved"), ...mismatch }) }));
    await POST(request());
    expect(issue).not.toHaveBeenCalled();
  });
});
