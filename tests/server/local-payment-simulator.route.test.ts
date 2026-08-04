import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: { findUnique: vi.fn(), update: vi.fn() },
    appointment: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { GET, POST } from "@/app/api/dev/payment-simulator/route";
import { prisma } from "@/server/db/prisma";
import { createLocalPaymentToken } from "@/server/services/local-payment-simulator";

const findSubscription = vi.mocked(prisma.subscription.findUnique);
const updateSubscription = vi.mocked(prisma.subscription.update);
const findAppointment = vi.mocked(prisma.appointment.findUnique);
const updateAppointment = vi.mocked(prisma.appointment.update);

function postRequest(token: string, result: "approved" | "rejected") {
  const form = new FormData();
  form.set("token", token);
  form.set("result", result);
  return new NextRequest("http://localhost:3000/api/dev/payment-simulator", { method: "POST", body: form });
}

describe("local payment simulator route", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR", "true");
    vi.stubEnv("LOCAL_PAYMENT_SIMULATOR_SECRET", "dummy-secret-only-for-local-tests");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("renders an explicit no-real-money checkout", async () => {
    const token = createLocalPaymentToken({
      kind: "subscription",
      entityId: "subscription-ar",
      businessId: "business-ar",
      amount: 12990,
      currency: "ARS",
    });
    const response = await GET(new NextRequest(`http://localhost:3000/api/dev/payment-simulator?token=${token}`));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("SIMULADOR LOCAL");
    expect(html).toContain("SIN DINERO REAL");
  });

  it("activates an approved dummy international subscription", async () => {
    findSubscription.mockResolvedValue({
      id: "subscription-ar",
      businessId: "business-ar",
      mpSubscriptionId: "LOCAL_SUBSCRIPTION:dummy",
      billingCycle: "MONTHLY",
      isTrial: false,
      currentPeriodEnd: null,
    } as never);
    updateSubscription.mockResolvedValue({} as never);
    const token = createLocalPaymentToken({
      kind: "subscription",
      entityId: "subscription-ar",
      businessId: "business-ar",
      amount: 12990,
      currency: "ARS",
    });

    const response = await POST(postRequest(token, "approved"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("local_payment=approved");
    expect(updateSubscription).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "subscription-ar" },
      data: expect.objectContaining({ status: "ACTIVE", isTrial: false }),
    }));
  });

  it("confirms an approved dummy ARS deposit", async () => {
    findAppointment.mockResolvedValue({
      id: "appointment-ar",
      businessId: "business-ar",
      mpPreferenceId: "LOCAL_DEPOSIT:dummy",
      depositAmount: 2500,
      paymentStatus: "PENDING",
      status: "AWAITING_PAYMENT",
      business: { currencyCode: "ARS" },
    } as never);
    updateAppointment.mockResolvedValue({} as never);
    const token = createLocalPaymentToken({
      kind: "deposit",
      entityId: "appointment-ar",
      businessId: "business-ar",
      amount: 2500,
      currency: "ARS",
    });

    const response = await POST(postRequest(token, "approved"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/cita/appointment-ar?payment=success");
    expect(updateAppointment).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: "APPROVED", status: "CONFIRMED" }),
    }));
  });

  it("is unreachable in production even when the flag is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await GET(new NextRequest("http://localhost:3000/api/dev/payment-simulator?token=anything"));
    expect(response.status).toBe(404);
  });
});
