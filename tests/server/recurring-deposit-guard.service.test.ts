import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateManyAndReturn: vi.fn(),
  updateMany: vi.fn(),
  transaction: vi.fn(),
  syncAppointment: vi.fn(),
}));

const transactionClient = {
  appointment: {
    findFirst: mocks.findFirst,
    updateManyAndReturn: mocks.updateManyAndReturn,
  },
  recurringBooking: {
    updateMany: mocks.updateMany,
  },
};

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    appointment: {
      findFirst: mocks.findFirst,
      updateManyAndReturn: mocks.updateManyAndReturn,
    },
  },
}));

vi.mock("@/server/services/google-calendar.service", () => ({
  syncAppointmentToGoogle: mocks.syncAppointment,
  syncRecurringBookingAppointments: vi.fn(),
  removeAppointmentFromGoogle: vi.fn(),
  getGoogleCalendarBusySlots: vi.fn(),
}));

import {
  cancelRecurringBookingUnlessDepositApproved,
  cancelFutureSessions,
} from "@/server/services/recurring.service";

describe("recurring deposit cancellation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient));
    mocks.findFirst.mockResolvedValue(null);
    mocks.updateManyAndReturn.mockResolvedValue([{ id: "appointment-1" }]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.syncAppointment.mockResolvedValue({ synced: true });
  });

  it("does not cancel any session or its parent plan when a deposit is approved", async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: "paid-appointment" });

    const result = await cancelRecurringBookingUnlessDepositApproved({
      recurringBookingId: "booking-1",
      businessId: "business-1",
      fromDate: new Date("2026-09-01T00:00:00.000Z"),
      status: "CANCELLED",
    });

    expect(result).toMatchObject({ ok: false, code: "APPROVED" });
    expect(mocks.updateManyAndReturn).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.syncAppointment).not.toHaveBeenCalled();
  });

  it("cancels sessions and transitions the parent plan in one transaction", async () => {
    const result = await cancelRecurringBookingUnlessDepositApproved({
      recurringBookingId: "booking-1",
      businessId: "business-1",
      fromDate: new Date("2026-09-01T00:00:00.000Z"),
      status: "PAUSED",
      pausedUntil: new Date("2026-10-01T00:00:00.000Z"),
    });

    expect(result).toEqual({ ok: true, cancelledAppointmentIds: ["appointment-1"] });
    expect(mocks.updateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "CANCELLED" },
      where: expect.objectContaining({ paymentStatus: { not: "APPROVED" } }),
    }));
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PAUSED" }),
    }));
    expect(mocks.syncAppointment).toHaveBeenCalledWith("appointment-1");
  });

  it("also blocks the future-session endpoint before partially cancelling", async () => {
    mocks.findFirst.mockResolvedValueOnce({ id: "paid-appointment" });

    const result = await cancelFutureSessions("booking-1", new Date("2026-09-01T00:00:00.000Z"));

    expect(result).toMatchObject({ ok: false, code: "APPROVED" });
    expect(mocks.updateManyAndReturn).not.toHaveBeenCalled();
  });
});
