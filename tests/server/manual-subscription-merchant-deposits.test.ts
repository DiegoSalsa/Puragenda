import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const provider = vi.hoisted(() => ({ config: vi.fn(), createPreference: vi.fn() }));
vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class { constructor(config: unknown) { provider.config(config); } },
  Preference: class { create = provider.createPreference; },
}));
vi.mock("@/server/services/mercadopago-oauth.service", () => ({ getValidMercadoPagoAccessToken: vi.fn(async () => "dummy-business-deposit-token") }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  appointment: { findUnique: vi.fn(), update: vi.fn() },
  business: { update: vi.fn() }, subscription: { update: vi.fn(), upsert: vi.fn() },
} }));

import { POST } from "@/app/api/mercadopago/deposit-preference/route";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

describe("merchant deposits with a manual Puragenda subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR", "false");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "booking", depositAmount: 5000, paymentStatus: "NONE", customerName: "Fixture",
      business: { id: "manual-business", name: "Nails fixture", countryCode: "CL", currencyCode: "CLP", depositRequired: true, subscription: { paymentMethod: "BANK_TRANSFER", status: "ACTIVE", staffLimitOverride: 2 } },
      service: { name: "Manicure" },
    } as never);
    provider.createPreference.mockResolvedValue({ id: "deposit-preference", init_point: "https://example.test/deposit" });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("continues creating reservation deposits with the business credential while leaving subscription billing and connection untouched", async () => {
    const response = await POST(new NextRequest("http://localhost/api/mercadopago/deposit-preference", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appointmentId: "booking" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ preferenceId: "deposit-preference" });
    expect(getValidMercadoPagoAccessToken).toHaveBeenCalledWith("manual-business");
    expect(provider.config).toHaveBeenCalledWith({ accessToken: "dummy-business-deposit-token" });
    expect(provider.createPreference).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({
      items: [expect.objectContaining({ unit_price: 5000, currency_id: "CLP" })], external_reference: "booking",
    }) }));
    expect(prisma.business.update).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.appointment.update).toHaveBeenCalledWith({ where: { id: "booking" }, data: { mpPreferenceId: "deposit-preference", depositAmount: 5000, paymentStatus: "PENDING" } });
  });
});
