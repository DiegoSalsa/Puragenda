import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/customer-appointment-action.service", () => ({
  getCustomerAppointmentByToken: vi.fn(),
  hashCustomerAppointmentToken: vi.fn(() => "hashed-token"),
}));

vi.mock("@/server/email/send", () => ({
  sendAppointmentActionStaffNotification: vi.fn(),
  sendConfirmationEmail: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: { findFirst: vi.fn() },
    blockedDate: { findUnique: vi.fn() },
    businessHours: { findMany: vi.fn() },
    staffSchedule: { findMany: vi.fn() },
    scheduleBlock: { findFirst: vi.fn() },
    businessScheduleOverride: { findUnique: vi.fn() },
    staffScheduleOverride: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { rescheduleAppointmentAction } from "@/server/actions/appointment.actions";
import { prisma } from "@/server/db/prisma";
import { getCustomerAppointmentByToken } from "@/server/services/customer-appointment-action.service";

const appointment = {
  id: "appointment-1",
  status: "CONFIRMED",
  recurringBookingId: null,
  startTime: new Date("2026-08-20T14:00:00.000Z"),
  endTime: new Date("2026-08-20T15:00:00.000Z"),
  totalDuration: 60,
  totalPrice: 25000,
  additionalServiceIds: [],
  selectedOptions: null,
  customerName: "Camila",
  customerEmail: "camila@example.test",
  customerPhone: null,
  clientId: "client-1",
  staffId: "staff-1",
  service: { id: "service-1", name: "Corte", duration: 60 },
  staff: { id: "staff-1", name: "Diego", email: null },
  business: {
    id: "business-1",
    name: "Estudio",
    slug: "estudio",
    timezone: "America/Santiago",
    includeAppointmentActionsInConfirmationEmail: true,
    allowRescheduling: true,
    rescheduleHoursLimit: 24,
    allowSameDayBookings: false,
    minAdvanceBookingMinutes: 120,
  },
};

describe("public appointment rescheduling availability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T12:00:00.000Z"));
    vi.mocked(getCustomerAppointmentByToken).mockResolvedValue(
      appointment as never,
    );
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.businessScheduleOverride.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.staffScheduleOverride.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.businessHours.findMany).mockResolvedValue([
      {
        dayOfWeek: 2,
        startTime: "09:00",
        endTime: "18:00",
        isOpen: true,
        breakStart: "13:00",
        breakEnd: "14:00",
      },
    ] as never);
    vi.mocked(prisma.staffSchedule.findMany).mockResolvedValue([
      {
        dayOfWeek: 2,
        startTime: "09:00",
        endTime: "18:00",
        isWorking: true,
        breakStart: null,
        breakEnd: null,
      },
    ] as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a date blocked by the business", async () => {
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue({
      id: "blocked-1",
    } as never);

    const result = await rescheduleAppointmentAction(
      appointment.id,
      "2026-08-11T15:00:00.000Z",
      "2026-08-11T16:00:00.000Z",
      "a".repeat(64),
    );

    expect(result).toEqual({
      error: "El negocio no atiende el día seleccionado",
    });
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a time outside business hours", async () => {
    const result = await rescheduleAppointmentAction(
      appointment.id,
      "2026-08-11T23:00:00.000Z",
      "2026-08-12T00:00:00.000Z",
      "a".repeat(64),
    );

    expect(result).toEqual({
      error:
        "El horario seleccionado está fuera del horario de atención del negocio",
    });
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a time that overlaps the configured break", async () => {
    const result = await rescheduleAppointmentAction(
      appointment.id,
      "2026-08-11T17:30:00.000Z",
      "2026-08-11T18:30:00.000Z",
      "a".repeat(64),
    );

    expect(result).toEqual({
      error:
        "El horario seleccionado coincide con la pausa de atención del negocio",
    });
    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });
});
