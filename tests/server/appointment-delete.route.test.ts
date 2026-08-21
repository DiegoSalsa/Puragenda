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
  removeAppointmentFromGoogle: vi.fn(),
  syncAppointmentToGoogle: vi.fn(),
}));

vi.mock("@/server/lib/cloudinary", () => ({
  cloudinary: { uploader: { destroy: vi.fn() } },
}));
vi.mock("@/server/lib/audit", () => ({ createAuditLog: vi.fn() }));

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
    appointment: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { DELETE } from "@/app/api/dashboard/appointments/[id]/route";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getAppointmentByIdAndBusiness } from "@/server/services/appointment.service";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { removeAppointmentFromGoogle, syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { cloudinary } from "@/server/lib/cloudinary";

const business = { id: "business-1" };
const appointment = {
  id: "appointment-1",
  businessId: business.id,
  staffId: "staff-1",
  status: "AWAITING_PAYMENT",
  paymentStatus: "PENDING",
  depositAmount: 5000,
  depositReceiptPublicId: null,
  depositReceiptResourceType: null,
  recurringBookingId: null,
  service: { name: "Lifting", price: 20000 },
};

function request() {
  return new NextRequest("http://localhost/api/dashboard/appointments/appointment-1", {
    method: "DELETE",
  });
}

function routeContext() {
  return { params: Promise.resolve({ id: appointment.id }) };
}

function mutationCalls() {
  return [
    ...vi.mocked(prisma.appointment.deleteMany).mock.calls.map(([args]) => ({ method: "deleteMany", args })),
    ...vi.mocked(prisma.appointment.updateMany).mock.calls.map(([args]) => ({ method: "updateMany", args })),
    ...vi.mocked(prisma.appointment.delete).mock.calls.map(([args]) => ({ method: "delete", args })),
  ];
}

describe("DELETE dashboard appointment hotfix", () => {
  beforeEach(() => {
    vi.mocked(getApiSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getBusinessForUser).mockResolvedValue(business as never);
    vi.mocked(getStaffAgendaScope).mockResolvedValue({ ownStaffId: "staff-1" } as never);
    vi.mocked(getEffectiveBusinessPermissions).mockResolvedValue([
      DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN,
    ]);
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue(appointment as never);
    vi.mocked(prisma.appointment.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.appointment.delete).mockResolvedValue(appointment as never);
    vi.mocked(removeAppointmentFromGoogle).mockResolvedValue({ removed: false, reason: "mapping_not_found" });
    vi.mocked(syncAppointmentToGoogle).mockResolvedValue({ synced: false, reason: "appointment_not_found" });
    vi.mocked(cloudinary.uploader.destroy).mockResolvedValue({ result: "ok" } as never);
  });

  it("elimina únicamente una cita esperando pago y libera su hora", async () => {
    const response = await DELETE(request(), routeContext());

    expect([200, 204]).toContain(response.status);
    expect(getAppointmentByIdAndBusiness).toHaveBeenCalledWith(appointment.id, business.id);

    const calls = mutationCalls();
    expect(calls).toHaveLength(1);
    const mutation = calls[0];
    expect(mutation.args).toEqual(expect.objectContaining({
      where: expect.objectContaining({
        id: appointment.id,
        businessId: business.id,
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
      }),
    }));

    // A physical delete must remove the remote event first. A soft delete must
    // transition to CANCELLED, which is excluded by public slot availability.
    if (mutation.method === "updateMany") {
      expect(mutation.args).toEqual(expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      }));
    } else {
      expect(removeAppointmentFromGoogle).toHaveBeenCalledWith(appointment.id);
    }
  });

  it.each([
    ["PENDING", "PENDING"],
    ["CONFIRMED", "APPROVED"],
    ["CANCELLED", "PENDING"],
    ["CHECKED_IN", "PENDING"],
    ["COMPLETED", "APPROVED"],
    ["NO_SHOW", "PENDING"],
    ["AWAITING_PAYMENT", "APPROVED"],
    ["AWAITING_PAYMENT", "NONE"],
  ])("rechaza estado no eliminable %s/%s", async (status, paymentStatus) => {
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue({
      ...appointment,
      status,
      paymentStatus,
    } as never);

    const response = await DELETE(request(), routeContext());

    expect(response.status).toBe(409);
    expect(mutationCalls()).toHaveLength(0);
    expect(removeAppointmentFromGoogle).not.toHaveBeenCalled();
    expect(syncAppointmentToGoogle).not.toHaveBeenCalled();
  });

  it("rechaza a un actor sin permiso sobre la agenda de la cita", async () => {
    vi.mocked(getEffectiveBusinessPermissions).mockResolvedValue([
      DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN,
    ]);
    vi.mocked(getStaffAgendaScope).mockResolvedValue({ ownStaffId: "another-staff" } as never);

    const response = await DELETE(request(), routeContext());

    expect(response.status).toBe(403);
    expect(mutationCalls()).toHaveLength(0);
    expect(removeAppointmentFromGoogle).not.toHaveBeenCalled();
  });

  it("aborta sin borrar si no puede limpiar el evento Google existente", async () => {
    vi.mocked(removeAppointmentFromGoogle).mockResolvedValue({
      removed: false,
      reason: "google_api_error",
      error: "calendar unavailable",
    });

    const response = await DELETE(request(), routeContext());

    expect(response.status).toBe(502);
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it("limpia el comprobante Cloudinary después del borrado físico", async () => {
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue({
      ...appointment,
      depositReceiptPublicId: "receipts/appointment-1",
      depositReceiptResourceType: "raw",
    } as never);

    const response = await DELETE(request(), routeContext());

    expect(response.status).toBe(200);
    expect(vi.mocked(removeAppointmentFromGoogle).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(prisma.appointment.updateMany).mock.invocationCallOrder[0]);
    expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
  });

  it("mantiene el éxito aunque falle el cleanup del comprobante", async () => {
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue({
      ...appointment,
      depositReceiptPublicId: "receipts/appointment-1",
      depositReceiptResourceType: "image",
    } as never);
    vi.mocked(cloudinary.uploader.destroy).mockRejectedValue(new Error("Cloudinary unavailable"));

    const response = await DELETE(request(), routeContext());

    expect(response.status).toBe(200);
    expect(prisma.appointment.updateMany).toHaveBeenCalledTimes(1);
  });

  it("restaura Google si el pago gana la carrera antes del borrado", async () => {
    vi.mocked(removeAppointmentFromGoogle).mockResolvedValue({ removed: true });
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(syncAppointmentToGoogle).mockResolvedValue({
      synced: true,
      action: "updated",
      eventId: "google-event-1",
    });
    vi.mocked(getAppointmentByIdAndBusiness)
      .mockResolvedValueOnce(appointment as never)
      .mockResolvedValueOnce({
        ...appointment,
        status: "CONFIRMED",
        paymentStatus: "APPROVED",
      } as never);

    const response = await DELETE(request(), routeContext());

    expect(response.status).toBe(409);
    expect(syncAppointmentToGoogle).toHaveBeenCalledWith(appointment.id);
    expect(vi.mocked(syncAppointmentToGoogle).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(getAppointmentByIdAndBusiness).mock.invocationCallOrder[1]);
  });

  it("permite una sola eliminación cuando dos solicitudes compiten", async () => {
    let attempts = 0;
    const atomicMutation = vi.fn(async () => ({ count: attempts++ === 0 ? 1 : 0 }));
    vi.mocked(prisma.appointment.updateMany).mockImplementation(atomicMutation as never);

    const responses = await Promise.all([
      DELETE(request(), routeContext()),
      DELETE(request(), routeContext()),
    ]);

    expect(responses.filter((response) => [200, 204].includes(response.status))).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect(mutationCalls()).toHaveLength(2);
    expect(removeAppointmentFromGoogle).toHaveBeenCalledTimes(2);
    expect(syncAppointmentToGoogle).not.toHaveBeenCalled();
  });
});
