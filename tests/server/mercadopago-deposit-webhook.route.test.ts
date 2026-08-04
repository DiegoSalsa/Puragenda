import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/mercadopago-oauth.service", () => ({
  getValidMercadoPagoAccessToken: vi.fn(),
}));

vi.mock("@/server/email/send", () => ({
  sendDepositConfirmedNotifications: vi.fn(),
}));

vi.mock("@/server/services/google-calendar.service", () => ({
  syncAppointmentToGoogle: vi.fn(),
}));

import { POST } from "@/app/api/webhooks/deposit/route";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

const findAppointment = vi.mocked(prisma.appointment.findUnique);
const findRelatedAppointments = vi.mocked(prisma.appointment.findMany);
const updateAppointments = vi.mocked(prisma.appointment.updateMany);
const getAccessToken = vi.mocked(getValidMercadoPagoAccessToken);

function webhookRequest() {
  return new NextRequest("http://localhost/api/webhooks/deposit?businessId=business-ar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "payment", data: { id: "payment-dummy" } }),
  });
}

function appointment() {
  return {
    id: "appointment-ar",
    businessId: "business-ar",
    mpPreferenceId: "preference-ar",
    depositAmount: 2500,
    business: { currencyCode: "ARS" },
  };
}

describe("Mercado Pago deposit webhook verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getAccessToken.mockResolvedValue("TEST-DUMMY-ACCESS-TOKEN");
    findAppointment.mockResolvedValue(appointment() as never);
    findRelatedAppointments.mockResolvedValue([
      { id: "appointment-ar", depositAmount: 1500 },
      { id: "appointment-ar-2", depositAmount: 1000 },
    ] as never);
  });

  it.each([
    { transaction_amount: 1, currency_id: "ARS" },
    { transaction_amount: 2500, currency_id: "USD" },
  ])("does not approve a payment with mismatched amount or currency", async (payment) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "approved",
        external_reference: "appointment-ar",
        ...payment,
      }),
    }));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(updateAppointments).not.toHaveBeenCalled();
  });
});
