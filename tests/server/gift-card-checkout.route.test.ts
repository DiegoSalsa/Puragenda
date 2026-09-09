import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mp = vi.hoisted(() => ({ config: vi.fn(), create: vi.fn() }));
const db = vi.hoisted(() => ({
  business: { findUnique: vi.fn() },
  giftCardTemplate: { findFirst: vi.fn() },
  giftCardPurchase: { update: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {
    constructor(input: unknown) {
      mp.config(input);
    }
  },
  Preference: class {
    create = mp.create;
  },
}));
vi.mock("@/server/db/prisma", () => ({ prisma: db }));
vi.mock("@/server/lib/rate-limit", () => ({
  giftCardCheckoutLimiter: { check: vi.fn(() => null) },
}));
vi.mock("@/server/services/gift-card.service", () => ({
  createGiftCardPurchase: vi.fn(),
}));
vi.mock("@/server/services/mercadopago-oauth.service", () => ({
  getValidMercadoPagoAccessToken: vi.fn(),
}));

import { POST } from "@/app/api/business/[slug]/gift-cards/checkout/route";
import { createGiftCardPurchase } from "@/server/services/gift-card.service";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

const createPurchase = vi.mocked(createGiftCardPurchase);
const accessToken = vi.mocked(getValidMercadoPagoAccessToken);

function request(extra: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/business/bella/gift-cards/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      templateId: "template-1",
      buyerName: "Diego",
      buyerEmail: "diego@example.com",
      deliveryMode: "SELF",
      ...extra,
    }),
  });
}

describe("Gift Card public checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.business.findUnique.mockResolvedValue({
      id: "business-1",
      slug: "bella",
      name: "Bella",
      countryCode: "CL",
      currencyCode: "CLP",
    });
    db.giftCardTemplate.findFirst.mockResolvedValue({ id: "template-1" });
    accessToken.mockResolvedValue("seller-token");
    createPurchase.mockResolvedValue({
      id: "purchase-1",
      templateNameSnapshot: "Gift Card 50k",
      salePrice: 45_000,
      currencyCode: "CLP",
      buyerName: "Diego",
      buyerEmail: "diego@example.com",
    } as never);
    mp.create.mockResolvedValue({
      id: "preference-1",
      init_point: "https://mp.example/checkout",
    });
    db.giftCardPurchase.update.mockResolvedValue({});
    db.giftCardPurchase.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects an inactive or private template", async () => {
    db.giftCardTemplate.findFirst.mockResolvedValue(null);
    const response = await POST(request(), {
      params: Promise.resolve({ slug: "bella" }),
    });
    expect(response.status).toBe(404);
    expect(createPurchase).not.toHaveBeenCalled();
  });

  it("uses the canonical purchase price in the Mercado Pago preference", async () => {
    const response = await POST(request({ salePrice: 1 }), {
      params: Promise.resolve({ slug: "bella" }),
    });
    expect(response.status).toBe(201);
    expect(mp.create).toHaveBeenCalledWith({
      body: expect.objectContaining({
        items: [
          expect.objectContaining({
            unit_price: 45_000,
            currency_id: "CLP",
          }),
        ],
        external_reference: "purchase-1",
      }),
    });
  });

  it("does not forward a client-provided price to purchase creation", async () => {
    await POST(request({ salePrice: 1 }), {
      params: Promise.resolve({ slug: "bella" }),
    });
    expect(createPurchase).toHaveBeenCalledWith(
      expect.not.objectContaining({ salePrice: 1 }),
    );
  });

  it("requires the business seller Mercado Pago connection", async () => {
    accessToken.mockResolvedValue(null);
    const response = await POST(request(), {
      params: Promise.resolve({ slug: "bella" }),
    });
    expect(response.status).toBe(409);
    expect(createPurchase).not.toHaveBeenCalled();
    expect(mp.create).not.toHaveBeenCalled();
  });
});
