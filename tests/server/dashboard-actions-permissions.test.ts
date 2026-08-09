import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/server/auth/user-session", () => ({
  getCurrentSessionUser: vi.fn(),
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: vi.fn(),
  getStaffAgendaScope: vi.fn(),
}));

vi.mock("@/server/services/permissions.service", () => ({
  hasBusinessPermission: vi.fn(),
}));

vi.mock("@/server/email/send", () => ({
  sendStaffInviteEmail: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: { findFirst: vi.fn(), update: vi.fn() },
    business: { update: vi.fn() },
    businessHours: { upsert: vi.fn() },
    service: { count: vi.fn() },
    staff: { count: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    subscription: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import {
  createStaffAction,
  saveBusinessHoursAction,
  updateAppointmentStatusAction,
  updateBusinessPoliciesAction,
  updateProductionOrdersEnabledAction,
  updateServiceCategoryGroupingAction,
  updateStaffServicesAction,
} from "@/server/actions/dashboard.actions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import {
  getBusinessForUser,
  getStaffAgendaScope,
} from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const business = {
  id: "business-1",
  ownerId: "owner-1",
  slug: "demo",
  name: "Demo",
};

const manager = {
  id: "manager-1",
  email: "manager@example.test",
  name: "Manager",
  role: "RECEPTIONIST" as const,
  isSuperAdmin: false,
  tokenVersion: 1,
  adminAccess: false,
};

describe("dashboard action permission boundaries", () => {
  beforeEach(() => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue(manager);
    vi.mocked(getBusinessForUser).mockResolvedValue(business as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
  });

  it("does not let a non-owner create a privileged account", async () => {
    const result = await createStaffAction({
      name: "Nuevo admin",
      email: "new-admin@example.test",
      role: "ADMIN",
    });

    expect(result).toEqual({
      error: "Solo la cuenta owner puede asignar roles con acceso administrativo",
    });
    expect(prisma.staff.count).not.toHaveBeenCalled();
  });

  it("does not let a read-only profile change appointment status", async () => {
    vi.mocked(hasBusinessPermission).mockResolvedValue(false);

    const result = await updateAppointmentStatusAction(
      "appointment-1",
      "CONFIRMED",
    );

    expect(result).toEqual({
      error: "No tienes permisos para modificar citas",
    });
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("limits appointments.manage_own to the linked professional", async () => {
    vi.mocked(hasBusinessPermission)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "appointment-1",
      staffId: "staff-2",
    } as never);
    vi.mocked(getStaffAgendaScope).mockResolvedValue({
      canSeeAllAgendas: false,
      staffId: "staff-1",
      ownStaffId: "staff-1",
    });

    const result = await updateAppointmentStatusAction(
      "appointment-1",
      "CONFIRMED",
    );

    expect(result).toEqual({
      error: "No tienes permisos para modificar esta cita",
    });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it("checks services.manage before changing category grouping", async () => {
    vi.mocked(hasBusinessPermission).mockResolvedValue(false);

    const result = await updateServiceCategoryGroupingAction(true);

    expect(result).toEqual({
      error: "No tienes permisos para modificar la organización de servicios",
    });
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it("uses the effective settings permission instead of the legacy role", async () => {
    vi.mocked(prisma.business.update).mockResolvedValue({} as never);

    const result = await updateProductionOrdersEnabledAction(true);

    expect(result).toEqual({ success: true });
    expect(prisma.business.update).toHaveBeenCalledWith({
      where: { id: business.id },
      data: { productionOrdersEnabled: true },
    });
  });

  it("rejects service assignments from another business", async () => {
    vi.mocked(prisma.staff.findFirst).mockResolvedValue({ id: "staff-1" } as never);
    vi.mocked(prisma.service.count).mockResolvedValue(1);

    const result = await updateStaffServicesAction("staff-1", [
      "service-local",
      "service-foreign",
    ]);

    expect(result).toEqual({
      error: "Uno o más servicios no pertenecen a este negocio",
    });
    expect(prisma.staff.update).not.toHaveBeenCalled();
  });

  it("rejects a break outside the business opening hours", async () => {
    const result = await saveBusinessHoursAction([
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "18:00",
        isOpen: true,
        breakStart: "08:30",
        breakEnd: "09:30",
      },
    ]);

    expect(result).toEqual({
      error: "La pausa debe estar dentro del horario laboral",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects schedules that cross midnight", async () => {
    const result = await saveBusinessHoursAction([
      {
        dayOfWeek: 1,
        startTime: "22:00",
        endTime: "02:00",
        isOpen: true,
      },
    ]);

    expect(result).toEqual({
      error: "La hora de inicio debe ser anterior a la hora de fin",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-finite booking policy values", async () => {
    const result = await updateBusinessPoliciesAction({
      allowRescheduling: true,
      rescheduleHoursLimit: 24,
      includeAppointmentActionsInConfirmationEmail: true,
      requiresClientRut: false,
      allowSameDayBookings: true,
      slotInterval: Number.NaN,
      minAdvanceBookingMinutes: 120,
    });

    expect(result).toEqual({
      error: "Usa valores numéricos válidos para las políticas de reserva",
    });
    expect(prisma.business.update).not.toHaveBeenCalled();
  });

  it("accepts a five-minute custom booking interval", async () => {
    vi.mocked(prisma.business.update).mockResolvedValue({} as never);

    const result = await updateBusinessPoliciesAction({
      allowRescheduling: true,
      rescheduleHoursLimit: 24,
      includeAppointmentActionsInConfirmationEmail: true,
      requiresClientRut: false,
      allowSameDayBookings: true,
      slotInterval: 5,
      minAdvanceBookingMinutes: 0,
    });

    expect(result).toEqual({ success: true });
    expect(prisma.business.update).toHaveBeenCalledWith({
      where: { id: business.id },
      data: {
        allowRescheduling: true,
        rescheduleHoursLimit: 24,
        includeAppointmentActionsInConfirmationEmail: true,
        requiresClientRut: false,
        allowSameDayBookings: true,
        slotInterval: 5,
        minAdvanceBookingMinutes: 0,
      },
    });
  });
});
