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

vi.mock("@/server/services/google-calendar.service", () => ({
  syncAppointmentToGoogle: vi.fn(),
}));

vi.mock("@/server/services/deposit.service", () => ({
  cancelAppointmentUnlessDepositApproved: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { updateAppointmentStatusAction } from "@/server/actions/dashboard.actions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { cancelAppointmentUnlessDepositApproved } from "@/server/services/deposit.service";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";

const cancelDeposit = vi.mocked(cancelAppointmentUnlessDepositApproved);

describe("updateAppointmentStatusAction deposit-aware cancellation", () => {
  beforeEach(() => {
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getBusinessForUser).mockResolvedValue({ id: "business-1" } as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    vi.mocked(getStaffAgendaScope).mockResolvedValue({ ownStaffId: "staff-1" } as never);
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue({
      id: "appointment-1",
      businessId: "business-1",
      staffId: "staff-1",
    } as never);
    vi.mocked(syncAppointmentToGoogle).mockResolvedValue({ synced: true } as never);
  });

  it("cancels through the deposit-aware helper", async () => {
    cancelDeposit.mockResolvedValue({ ok: true });

    const result = await updateAppointmentStatusAction("appointment-1", "CANCELLED");

    expect(result).toEqual({ success: true });
    expect(cancelDeposit).toHaveBeenCalledWith({
      appointmentId: "appointment-1",
      businessId: "business-1",
    });
    expect(prisma.appointment.update).not.toHaveBeenCalled();
    expect(syncAppointmentToGoogle).toHaveBeenCalledWith("appointment-1");
  });

  it("returns the helper error when an approved deposit cannot be cancelled", async () => {
    cancelDeposit.mockResolvedValue({
      ok: false,
      error: "No se puede cancelar una cita con abono aprobado. Requiere resolución manual.",
      code: "APPROVED",
    });

    const result = await updateAppointmentStatusAction("appointment-1", "CANCELLED");

    expect(result).toEqual({
      error: "No se puede cancelar una cita con abono aprobado. Requiere resolución manual.",
    });
    expect(syncAppointmentToGoogle).not.toHaveBeenCalled();
  });

  it("still uses a plain update for non-cancel status changes", async () => {
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as never);

    const result = await updateAppointmentStatusAction("appointment-1", "CHECKED_IN");

    expect(result).toEqual({ success: true });
    expect(cancelDeposit).not.toHaveBeenCalled();
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "appointment-1" },
      data: { status: "CHECKED_IN" },
    });
  });
});
