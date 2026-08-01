import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appointmentFindFirst: vi.fn(),
  appointmentFindUnique: vi.fn(),
  googleBusy: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: {
      findFirst: mocks.appointmentFindFirst,
      findUnique: mocks.appointmentFindUnique,
    },
  },
}));

vi.mock("@/server/services/google-calendar.service", () => ({
  getGoogleCalendarBusySlots: mocks.googleBusy,
  syncAppointmentToGoogle: vi.fn(),
}));

import { checkAppointmentCollision } from "@/server/services/appointment.service";

describe("appointment collisions with Google Calendar", () => {
  const start = new Date("2026-08-10T14:00:00Z");
  const end = new Date("2026-08-10T15:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appointmentFindFirst.mockResolvedValue(null);
    mocks.appointmentFindUnique.mockResolvedValue(null);
  });

  it("blocks an externally busy worker slot", async () => {
    mocks.googleBusy.mockResolvedValue([{ startTime: start, endTime: end }]);

    await expect(
      checkAppointmentCollision("business-1", start, end, "staff-1"),
    ).resolves.toMatchObject({
      hasCollision: true,
      conflictingAppointment: { customerName: "Google Calendar" },
    });
  });

  it("does not treat the appointment's own Google event as an edit collision", async () => {
    mocks.googleBusy.mockResolvedValue([{ startTime: start, endTime: end }]);
    mocks.appointmentFindUnique.mockResolvedValue({
      startTime: start,
      endTime: end,
      googleCalendarEvent: { id: "mapping-1" },
    });

    await expect(
      checkAppointmentCollision("business-1", start, end, "staff-1", "appointment-1"),
    ).resolves.toEqual({ hasCollision: false });
  });
});
