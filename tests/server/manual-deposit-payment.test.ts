import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: vi.fn(),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: vi.fn(),
  getStaffAgendaScope: vi.fn(),
}));

vi.mock("@/server/services/appointment.service", () => ({
  getAppointmentByIdAndBusiness: vi.fn(),
}));

vi.mock("@/server/services/permissions.service", () => ({
  getEffectiveBusinessPermissions: vi.fn(),
}));

vi.mock("@/server/services/google-calendar.service", () => ({
  syncAppointmentToGoogle: vi.fn(),
}));

vi.mock("@/server/email/send", () => ({
  sendConfirmationEmail: vi.fn(),
  sendCancellationEmail: vi.fn(),
  sendAppointmentActionStaffNotification: vi.fn(),
}));

vi.mock("@/server/actions/loyalty.actions", () => ({
  processLoyaltyStamps: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: { updateMany: vi.fn(), findUnique: vi.fn() },
    client: { update: vi.fn() },
  },
}));

import { PATCH } from "@/app/api/dashboard/appointments/[id]/route";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { sendConfirmationEmail } from "@/server/email/send";
import { getAppointmentByIdAndBusiness } from "@/server/services/appointment.service";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";

const appointment = {
  id: "appointment-1",
  businessId: "business-1",
  staffId: "staff-1",
  clientId: "client-1",
  status: "AWAITING_PAYMENT",
  paymentStatus: "PENDING",
  depositAmount: 5000,
  service: { name: "Lifting", price: 20000 },
};

function request() {
  return new NextRequest("http://localhost/api/dashboard/appointments/appointment-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ markDepositPaid: true }),
  });
}

describe("manual deposit confirmation", () => {
  beforeEach(() => {
    vi.mocked(getApiSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getBusinessForUser).mockResolvedValue({ id: "business-1" } as never);
    vi.mocked(getStaffAgendaScope).mockResolvedValue({ ownStaffId: "staff-1" } as never);
    vi.mocked(getEffectiveBusinessPermissions).mockResolvedValue([
      DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN,
    ]);
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue(appointment as never);
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      ...appointment,
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
      customerName: "Clienta",
      customerEmail: "clienta@example.test",
      startTime: new Date("2026-08-20T14:00:00.000Z"),
      endTime: new Date("2026-08-20T15:00:00.000Z"),
      staff: null,
      business: { name: "LottySkin", timezone: "America/Argentina/Buenos_Aires", owner: null },
    } as never);
  });

  it("atomically approves the payment, confirms the appointment and sends confirmation", async () => {
    const response = await PATCH(request(), {
      params: Promise.resolve({ id: "appointment-1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: "appointment-1", status: "AWAITING_PAYMENT", paymentStatus: "PENDING" },
      data: { status: "CONFIRMED", paymentStatus: "APPROVED" },
    });
    expect(syncAppointmentToGoogle).toHaveBeenCalledWith("appointment-1");
    expect(sendConfirmationEmail).toHaveBeenCalledOnce();
  });

  it("records who approved a submitted receipt", async () => {
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue({
      ...appointment,
      depositReceiptStatus: "PENDING",
    } as never);

    const response = await PATCH(request(), {
      params: Promise.resolve({ id: "appointment-1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: "appointment-1", status: "AWAITING_PAYMENT", paymentStatus: "PENDING" },
      data: expect.objectContaining({
        status: "CONFIRMED",
        paymentStatus: "APPROVED",
        depositReceiptStatus: "APPROVED",
        depositReceiptReviewedById: "user-1",
        depositReceiptReviewedAt: expect.any(Date),
      }),
    });
  });

  it("allows a rejected online payment to be confirmed as received manually", async () => {
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue({
      ...appointment,
      paymentStatus: "REJECTED",
    } as never);

    const response = await PATCH(request(), {
      params: Promise.resolve({ id: "appointment-1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "appointment-1",
        status: "AWAITING_PAYMENT",
        paymentStatus: "REJECTED",
      },
      data: { status: "CONFIRMED", paymentStatus: "APPROVED" },
    });
  });

  it("refuses to approve an appointment whose deposit is no longer pending", async () => {
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue({
      ...appointment,
      status: "CANCELLED",
    } as never);

    const response = await PATCH(request(), {
      params: Promise.resolve({ id: "appointment-1" }),
    });

    expect(response.status).toBe(409);
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
    expect(sendConfirmationEmail).not.toHaveBeenCalled();
  });
});
