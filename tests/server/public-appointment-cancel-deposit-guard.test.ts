import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const appointment = {
  id: "appointment-1",
  businessId: "business-1",
  status: "CONFIRMED",
  paymentStatus: "APPROVED",
  startTime: new Date("2030-01-01T12:00:00.000Z"),
  customerName: "Cliente",
  customerEmail: "cliente@example.test",
  service: { name: "Corte" },
  staff: { name: "Ana", email: "ana@example.test" },
  business: {
    includeAppointmentActionsInConfirmationEmail: true,
    name: "Salón",
    slug: "salon",
    timezone: "America/Santiago",
    owner: { email: "owner@example.test", name: "Owner" },
  },
};

vi.mock("@/server/services/client-portal.service", () => ({
  getClientPortalAppointment: vi.fn(),
  getClientPortalEmailFromRequest: vi.fn(),
}));
vi.mock("@/server/services/customer-appointment-action.service", () => ({
  getCustomerAppointmentByToken: vi.fn(),
  hashCustomerAppointmentToken: vi.fn(() => "token-hash"),
}));
vi.mock("@/server/services/deposit.service", () => ({
  cancelAppointmentUnlessDepositApproved: vi.fn(),
}));
vi.mock("@/server/services/google-calendar.service", () => ({ syncAppointmentToGoogle: vi.fn() }));
vi.mock("@/server/email/send", () => ({
  sendAppointmentActionNotification: vi.fn(),
  sendAppointmentActionStaffNotification: vi.fn(),
  sendCancellationEmail: vi.fn(),
}));
vi.mock("@/server/lib/rate-limit", () => ({ appointmentActionLimiter: { check: vi.fn(() => null) } }));
vi.mock("@/server/db/prisma", () => ({ prisma: { appointment: { findUnique: vi.fn() } } }));

import { POST as cancelFromPortal } from "@/app/api/client-portal/appointments/[appointmentId]/cancel/route";
import { POST as cancelFromManagementLink } from "@/app/api/appointments/manage/route";
import { POST as cancelFromLegacyLink } from "@/app/api/appointments/action/route";
import { prisma } from "@/server/db/prisma";
import { getClientPortalAppointment, getClientPortalEmailFromRequest } from "@/server/services/client-portal.service";
import { getCustomerAppointmentByToken } from "@/server/services/customer-appointment-action.service";
import { cancelAppointmentUnlessDepositApproved } from "@/server/services/deposit.service";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";

const cancelDeposit = vi.mocked(cancelAppointmentUnlessDepositApproved);
const syncGoogle = vi.mocked(syncAppointmentToGoogle);

const approvedError = {
  ok: false as const,
  code: "APPROVED" as const,
  error: "No se puede cancelar una cita con abono aprobado. Requiere resolución manual.",
};

describe("public cancellation deposit guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cancelDeposit.mockResolvedValue(approvedError);
    vi.mocked(getClientPortalEmailFromRequest).mockResolvedValue("cliente@example.test");
    vi.mocked(getClientPortalAppointment).mockResolvedValue(appointment as never);
    vi.mocked(getCustomerAppointmentByToken).mockResolvedValue(appointment as never);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      ...appointment,
      actionToken: "legacy-token",
    } as never);
  });

  it("does not let the client portal cancel an approved deposit", async () => {
    const response = await cancelFromPortal(
      new NextRequest("http://localhost/api/client-portal/appointments/appointment-1/cancel", { method: "POST" }),
      { params: Promise.resolve({ appointmentId: "appointment-1" }) },
    );

    expect(response?.status).toBe(409);
    expect(cancelDeposit).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: "appointment-1",
      businessId: "business-1",
    }));
    expect(syncGoogle).not.toHaveBeenCalled();
  });

  it("does not let the customer management link cancel an approved deposit", async () => {
    const response = await cancelFromManagementLink(new NextRequest("http://localhost/api/appointments/manage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "a".repeat(64), action: "cancel", confirmation: "CANCELAR" }),
    }));

    expect(response.status).toBe(409);
    expect(cancelDeposit).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: "appointment-1",
      businessId: "business-1",
    }));
    expect(syncGoogle).not.toHaveBeenCalled();
  });

  it("does not let the legacy action link cancel an approved deposit", async () => {
    const response = await cancelFromLegacyLink(new NextRequest("http://localhost/api/appointments/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "legacy-token", action: "cancel", confirmation: "CANCELAR" }),
    }));

    expect(response?.status).toBe(409);
    expect(cancelDeposit).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: "appointment-1",
      businessId: "business-1",
    }));
    expect(syncGoogle).not.toHaveBeenCalled();
  });
});
