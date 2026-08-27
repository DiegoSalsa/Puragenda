import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/services/mercadopago-oauth.service", () => ({
  getValidMercadoPagoAccessToken: vi.fn(),
}));

vi.mock("@/server/services/deposit.service", () => ({
  findRelatedDepositAppointments: vi.fn(),
  confirmDepositPayment: vi.fn(),
  rejectDepositPayment: vi.fn(),
}));

import { GET } from "@/app/api/mercadopago/deposit-return/route";
import { prisma } from "@/server/db/prisma";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import {
  confirmDepositPayment,
  findRelatedDepositAppointments,
  rejectDepositPayment,
} from "@/server/services/deposit.service";

const findAppointment = vi.mocked(prisma.appointment.findUnique);
const getAccessToken = vi.mocked(getValidMercadoPagoAccessToken);
const findRelated = vi.mocked(findRelatedDepositAppointments);
const confirmPayment = vi.mocked(confirmDepositPayment);
const rejectPayment = vi.mocked(rejectDepositPayment);

function appointment(currencyCode = "ARS") {
  return {
    id: "appointment-ar",
    businessId: "business-ar",
    mpPreferenceId: "preference-ar",
    depositAmount: 2500,
    business: { slug: "negocio-ar", name: "Negocio AR", currencyCode },
    service: { name: "Servicio Dummy" },
  };
}

function request() {
  return new NextRequest(
    "http://localhost/api/mercadopago/deposit-return?appointmentId=appointment-ar&status=approved&payment_id=payment-dummy",
  );
}

describe("Mercado Pago deposit return verification", () => {
  beforeEach(() => {
    findAppointment.mockResolvedValue(appointment() as never);
    findRelated.mockResolvedValue([{ id: "appointment-ar", depositAmount: 2500 }]);
    getAccessToken.mockResolvedValue("TEST-DUMMY-SELLER-TOKEN");
    confirmPayment.mockResolvedValue({
      alreadyProcessed: false,
      confirmedIds: ["appointment-ar"],
      auditedOnlyIds: [],
      shouldRunSideEffects: true,
    });
  });

  it("approves only after provider-confirmed reference, amount and currency", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "approved",
      external_reference: "appointment-ar",
      transaction_amount: 2500,
      currency_id: "ARS",
    }), { status: 200 })));

    const response = await GET(request());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/cita/appointment-ar?payment=success");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.mercadopago.com/v1/payments/payment-dummy",
      { headers: { Authorization: "Bearer TEST-DUMMY-SELLER-TOKEN" }, cache: "no-store" },
    );
    expect(confirmPayment).toHaveBeenCalledWith({
      appointmentIds: ["appointment-ar"],
      businessId: "business-ar",
      paymentId: "payment-dummy",
      source: "return",
    });
  });

  it("does not present a late payment on a cancelled appointment as confirmed", async () => {
    confirmPayment.mockResolvedValue({
      alreadyProcessed: false,
      confirmedIds: [],
      auditedOnlyIds: ["appointment-ar"],
      shouldRunSideEffects: false,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "approved",
      external_reference: "appointment-ar",
      transaction_amount: 2500,
      currency_id: "ARS",
    }), { status: 200 })));

    const response = await GET(request());

    expect(response.headers.get("location")).toBe("http://localhost:3000/cita/appointment-ar?payment=recorded");
    expect(confirmPayment).toHaveBeenCalled();
  });

  it("does not present a grouped payment as confirmed when its primary appointment was cancelled", async () => {
    confirmPayment.mockResolvedValue({
      alreadyProcessed: false,
      confirmedIds: ["appointment-ar-2"],
      auditedOnlyIds: ["appointment-ar"],
      shouldRunSideEffects: true,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: "approved",
      external_reference: "appointment-ar",
      transaction_amount: 2500,
      currency_id: "ARS",
    }), { status: 200 })));

    const response = await GET(request());

    expect(response.headers.get("location")).toBe("http://localhost:3000/cita/appointment-ar?payment=recorded");
  });

  it.each([
    { field: "external_reference", value: "other-appointment" },
    { field: "transaction_amount", value: 1 },
    { field: "currency_id", value: "CLP" },
  ])("does not approve a mismatched provider $field", async ({ field, value }) => {
    const providerPayment = {
      status: "approved",
      external_reference: "appointment-ar",
      transaction_amount: 2500,
      currency_id: "ARS",
      [field]: value,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(providerPayment), { status: 200 })));

    const response = await GET(request());

    expect(response.headers.get("location")).toBe("http://localhost:3000/cita/appointment-ar?payment=pending");
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(rejectPayment).not.toHaveBeenCalled();
  });
});
