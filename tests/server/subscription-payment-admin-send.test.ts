import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const templateMock = vi.hoisted(() => vi.fn(() => ({ subject: "Nueva suscripción pagada — Cinnamon nails", html: "<p>payment-1</p>" })));

vi.mock("@/server/email/resend", () => ({
  resend: { emails: { send: sendMock } },
  EMAIL_FROM: "Puragenda <qa@example.test>",
}));
vi.mock("@/core/constants", () => ({ ADMIN_NOTIFICATION_EMAILS: ["contacto@purocode.com", "ops@purocode.com"] }));
vi.mock("@/server/email/templates", () => ({
  subscriptionPaymentAdminEmail: templateMock,
}));
vi.mock("@/server/db/prisma", () => ({ prisma: { business: { findUnique: vi.fn(), findFirst: vi.fn() } } }));
vi.mock("@/server/services/client-portal.service", () => ({ getClientPortalAppUrl: vi.fn(), issueClientPortalEmailToken: vi.fn() }));
vi.mock("@/server/services/customer-appointment-action.service", () => ({ issueCustomerAppointmentToken: vi.fn() }));

import { sendSubscriptionPaymentAdminNotification } from "@/server/email/send";

describe("subscription payment admin recipients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "mail-1" }, error: null });
  });

  it("delivers the same confirmed-payment notification to every configured admin", async () => {
    const result = await sendSubscriptionPaymentAdminNotification({
      businessName: "Cinnamon nails",
      ownerName: "Owner",
      ownerEmail: "owner@example.com",
      plan: "EQUIPO",
      billingCycle: "Mensual",
      provider: "Mercado Pago",
      paymentId: "payment-1",
      paymentAt: new Date("2026-09-14T12:00:00Z"),
      amountLabel: "$19.990",
      paymentType: "Primer pago",
      firstPayment: true,
      fromTrial: false,
      recovery: false,
    });

    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["contacto@purocode.com", "ops@purocode.com"] }),
      { idempotencyKey: "subscription-payment/mercado-pago/payment-1" },
    );
  });

  it("returns false when any configured recipient is rejected", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "rejected" } });

    await expect(sendSubscriptionPaymentAdminNotification({
      businessName: "Cinnamon nails",
      ownerName: "Owner",
      ownerEmail: "owner@example.com",
      plan: "EQUIPO",
      billingCycle: "Mensual",
      provider: "Mercado Pago",
      paymentId: "payment-1",
      paymentAt: new Date("2026-09-14T12:00:00Z"),
      paymentType: "Renovación",
      firstPayment: false,
      fromTrial: false,
      recovery: false,
    })).resolves.toBe(false);
  });
});
