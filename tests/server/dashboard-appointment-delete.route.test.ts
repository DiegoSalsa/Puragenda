import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  business: vi.fn(),
  appointment: vi.fn(),
  agendaScope: vi.fn(),
  permissions: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: mocks.session,
}));
vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: mocks.business,
  getStaffAgendaScope: mocks.agendaScope,
}));
vi.mock("@/server/services/permissions.service", () => ({
  getEffectiveBusinessPermissions: mocks.permissions,
}));
vi.mock("@/server/services/appointment.service", () => ({
  getAppointmentByIdAndBusiness: mocks.appointment,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { appointment: { deleteMany: mocks.deleteMany } },
}));
vi.mock("@/server/email/send", () => ({
  sendConfirmationEmail: vi.fn(),
  sendCancellationEmail: vi.fn(),
  sendAppointmentActionStaffNotification: vi.fn(),
}));
vi.mock("@/server/actions/loyalty.actions", () => ({ processLoyaltyStamps: vi.fn() }));
vi.mock("@/server/validations/appointment-management", () => ({ managedAppointmentSchema: { safeParse: vi.fn() } }));
vi.mock("@/server/services/appointment-management.service", () => ({ resolveManagedAppointment: vi.fn() }));
vi.mock("@/server/services/google-calendar.service", () => ({
  removeAppointmentFromGoogle: vi.fn().mockResolvedValue({ removed: false, reason: "mapping_not_found" }),
  syncAppointmentToGoogle: vi.fn(),
}));
vi.mock("@/server/lib/cloudinary", () => ({
  cloudinary: { uploader: { destroy: vi.fn() } },
}));

import { DELETE } from "@/app/api/dashboard/appointments/[id]/route";

const appointmentId = "appointment-1";
const business = { id: "business-1" };
const pendingAppointment = {
  id: appointmentId,
  staffId: "staff-1",
  status: "AWAITING_PAYMENT",
  paymentStatus: "PENDING",
  depositReceiptPublicId: null,
  depositReceiptResourceType: null,
  recurringBookingId: null,
};

function request() {
  return new NextRequest(`http://localhost/api/dashboard/appointments/${appointmentId}`, {
    method: "DELETE",
  });
}

describe("dashboard appointment DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: "user-1" });
    mocks.business.mockResolvedValue(business);
    mocks.appointment.mockResolvedValue(pendingAppointment);
    mocks.agendaScope.mockResolvedValue({ ownStaffId: null });
    mocks.permissions.mockResolvedValue(["appointments.manage_all"]);
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("requires an authenticated dashboard session", async () => {
    mocks.session.mockResolvedValue(null);

    const response = await DELETE(request(), { params: Promise.resolve({ id: appointmentId }) });

    expect(response.status).toBe(401);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects appointments that are not awaiting payment", async () => {
    mocks.appointment.mockResolvedValue({ ...pendingAppointment, status: "CONFIRMED", paymentStatus: "APPROVED" });

    const response = await DELETE(request(), { params: Promise.resolve({ id: appointmentId }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("esperando pago") });
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("enforces the dashboard appointment scope before deleting", async () => {
    mocks.permissions.mockResolvedValue(["appointments.manage_own"]);
    mocks.agendaScope.mockResolvedValue({ ownStaffId: "staff-2" });

    const response = await DELETE(request(), { params: Promise.resolve({ id: appointmentId }) });

    expect(response.status).toBe(403);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes only the business-owned appointment still awaiting payment", async () => {
    const response = await DELETE(request(), { params: Promise.resolve({ id: appointmentId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: {
        id: appointmentId,
        businessId: business.id,
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        recurringBookingId: null,
      },
    });
  });

  it("returns a conflict when the payment state changes before deletion", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });
    mocks.appointment
      .mockResolvedValueOnce(pendingAppointment)
      .mockResolvedValueOnce({ ...pendingAppointment, status: "CONFIRMED", paymentStatus: "APPROVED" });

    const response = await DELETE(request(), { params: Promise.resolve({ id: appointmentId }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("cambió") });
  });
});
