import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mpMocks = vi.hoisted(() => ({
  config: vi.fn(),
  createPreference: vi.fn(),
}));

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class {
    constructor(options: unknown) {
      mpMocks.config(options);
    }
  },
  Preference: class {
    create = mpMocks.createPreference;
  },
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/mercadopago-oauth.service", () => ({
  getValidMercadoPagoAccessToken: vi.fn(),
}));

import { POST } from "@/app/api/mercadopago/deposit-preference/route";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";

const findAppointment = vi.mocked(prisma.appointment.findUnique);
const updateAppointment = vi.mocked(prisma.appointment.update);
const getAccessToken = vi.mocked(getValidMercadoPagoAccessToken);

const countries = [
  { countryCode: "CL", currencyCode: "CLP" },
  { countryCode: "AR", currencyCode: "ARS" },
  { countryCode: "BR", currencyCode: "BRL" },
  { countryCode: "CO", currencyCode: "COP" },
  { countryCode: "MX", currencyCode: "MXN" },
  { countryCode: "PE", currencyCode: "PEN" },
  { countryCode: "UY", currencyCode: "UYU" },
];

function request() {
  return new NextRequest("http://localhost/api/mercadopago/deposit-preference", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ appointmentId: "appointment-dummy" }),
  });
}

function dummyAppointment(countryCode: string, currencyCode: string) {
  return {
    id: `appointment-${countryCode.toLowerCase()}`,
    customerName: "Cliente Dummy",
    depositAmount: 2500,
    paymentStatus: "PENDING",
    depositPaymentUrl: null,
    business: {
      id: `business-${countryCode.toLowerCase()}`,
      name: `Negocio ${countryCode}`,
      countryCode,
      currencyCode,
      depositRequired: true,
      depositPaymentMode: "MERCADOPAGO",
    },
    service: { name: "Servicio Dummy" },
  };
}

describe("Mercado Pago local dummy deposit flow", () => {
  beforeEach(() => {
    getAccessToken.mockResolvedValue("TEST-DUMMY-ACCESS-TOKEN");
    updateAppointment.mockResolvedValue({} as never);
    mpMocks.createPreference.mockResolvedValue({
      id: "dummy-preference",
      init_point: "https://example.test/pay/dummy",
      sandbox_init_point: "https://sandbox.example.test/pay/dummy",
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it.each(countries)(
    "creates the same preference shape for $countryCode using $currencyCode",
    async ({ countryCode, currencyCode }) => {
      findAppointment.mockResolvedValue(dummyAppointment(countryCode, currencyCode) as never);

      const response = await POST(request());
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toMatchObject({
        preferenceId: "dummy-preference",
        sandboxInitPoint: "https://sandbox.example.test/pay/dummy",
      });
      expect(mpMocks.config).toHaveBeenLastCalledWith({ accessToken: "TEST-DUMMY-ACCESS-TOKEN" });
      expect(mpMocks.createPreference).toHaveBeenLastCalledWith({
        body: expect.objectContaining({
          items: [expect.objectContaining({ currency_id: currencyCode, unit_price: 2500 })],
          external_reference: `appointment-${countryCode.toLowerCase()}`,
        }),
      });
      expect(updateAppointment).toHaveBeenLastCalledWith({
        where: { id: `appointment-${countryCode.toLowerCase()}` },
        data: {
          mpPreferenceId: "dummy-preference",
          depositAmount: 2500,
          paymentStatus: "PENDING",
        },
      });
    },
  );

  it("does not call Mercado Pago without a connected seller token", async () => {
    findAppointment.mockResolvedValue(dummyAppointment("AR", "ARS") as never);
    getAccessToken.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "El negocio no tiene Mercado Pago conectado" });
    expect(mpMocks.createPreference).not.toHaveBeenCalled();
  });

  it("returns the service payment link without calling Mercado Pago in manual mode", async () => {
    findAppointment.mockResolvedValue({
      ...dummyAppointment("AR", "ARS"),
      depositPaymentUrl: "https://link.mercadopago.com.ar/lottyskin-abono",
      business: {
        ...dummyAppointment("AR", "ARS").business,
        depositPaymentMode: "MANUAL_LINK",
      },
    } as never);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      preferenceId: null,
      initPoint: "https://link.mercadopago.com.ar/lottyskin-abono",
      sandboxInitPoint: null,
      manual: true,
    });
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(mpMocks.createPreference).not.toHaveBeenCalled();
    expect(updateAppointment).not.toHaveBeenCalled();
  });

  it("rejects a manual deposit appointment without a stored payment link", async () => {
    findAppointment.mockResolvedValue({
      ...dummyAppointment("AR", "ARS"),
      business: {
        ...dummyAppointment("AR", "ARS").business,
        depositPaymentMode: "MANUAL_LINK",
      },
    } as never);

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Esta cita no tiene un link de pago configurado",
    });
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(mpMocks.createPreference).not.toHaveBeenCalled();
  });

  it("rejects an incompatible currency before calling Mercado Pago", async () => {
    findAppointment.mockResolvedValue(dummyAppointment("AR", "USD") as never);

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Mercado Pago para AR solo esta habilitado en ARS. Cambia la moneda del negocio o desconecta Mercado Pago.",
    });
    expect(mpMocks.createPreference).not.toHaveBeenCalled();
    expect(updateAppointment).not.toHaveBeenCalled();
  });

  it("uses the local simulator for any country without seller credentials", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR", "true");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR_SECRET", "dummy-secret-only-for-local-tests");
    findAppointment.mockResolvedValue(dummyAppointment("ES", "EUR") as never);
    getAccessToken.mockResolvedValue(null);

    const response = await POST(request());
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ simulated: true });
    expect(result.initPoint).toContain("/api/dev/payment-simulator?token=");
    expect(mpMocks.createPreference).not.toHaveBeenCalled();
    expect(updateAppointment).toHaveBeenCalledWith({
      where: { id: "appointment-es" },
      data: {
        mpPreferenceId: expect.stringMatching(/^LOCAL_DEPOSIT:/),
        depositAmount: 2500,
        paymentStatus: "PENDING",
      },
    });
  });
});
