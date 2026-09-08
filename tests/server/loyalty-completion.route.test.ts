import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: vi.fn() }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn(), getStaffAgendaScope: vi.fn() }));
vi.mock("@/server/services/appointment.service", () => ({ getAppointmentByIdAndBusiness: vi.fn() }));
vi.mock("@/server/services/permissions.service", () => ({ getEffectiveBusinessPermissions: vi.fn() }));
vi.mock("@/server/services/google-calendar.service", () => ({ syncAppointmentToGoogle: vi.fn(), removeAppointmentFromGoogle: vi.fn() }));
vi.mock("@/server/email/send", () => ({ sendConfirmationEmail: vi.fn(), sendCancellationEmail: vi.fn(), sendAppointmentActionStaffNotification: vi.fn() }));
vi.mock("@/server/actions/loyalty.actions", () => ({ processLoyaltyStamps: vi.fn() }));
vi.mock("@/server/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/server/services/deposit.service", () => ({ cancelAppointmentUnlessDepositApproved: vi.fn() }));
vi.mock("@/server/services/appointment-management.service", () => ({ resolveManagedAppointment: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  appointment: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  client: { update: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
  $transaction: vi.fn(),
} }));

import { PATCH } from "@/app/api/dashboard/appointments/[id]/route";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { processLoyaltyStamps } from "@/server/actions/loyalty.actions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getAppointmentByIdAndBusiness } from "@/server/services/appointment.service";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";

const base = { id: "appointment-1", businessId: "business-1", staffId: "staff-1", clientId: "client-1", status: "CONFIRMED", service: { name: "Corte", price: 10_000 }, totalPrice: 10_000 };
const request = (status: string) => new NextRequest("http://localhost/api/dashboard/appointments/appointment-1", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });

describe("loyalty appointment trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getBusinessForUser).mockResolvedValue({ id: "business-1" } as never);
    vi.mocked(getStaffAgendaScope).mockResolvedValue({ ownStaffId: "staff-1" } as never);
    vi.mocked(getEffectiveBusinessPermissions).mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN]);
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue(base as never);
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({ count: 1 });
  });

  it("grants a stamp when a visit becomes COMPLETED", async () => {
    const response = await PATCH(request("COMPLETED"), { params: Promise.resolve({ id: base.id }) });
    expect(response.status).toBe(200);
    expect(processLoyaltyStamps).toHaveBeenCalledOnce();
  });

  it("does not grant a stamp at CHECKED_IN", async () => {
    await PATCH(request("CHECKED_IN"), { params: Promise.resolve({ id: base.id }) });
    expect(processLoyaltyStamps).not.toHaveBeenCalled();
  });

  it("lets the idempotent processor repair a repeated COMPLETED request", async () => {
    vi.mocked(getAppointmentByIdAndBusiness).mockResolvedValue({ ...base, status: "COMPLETED" } as never);
    await PATCH(request("COMPLETED"), { params: Promise.resolve({ id: base.id }) });
    expect(processLoyaltyStamps).toHaveBeenCalledWith(base.id);
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("does not dispatch twice when concurrent status transitions race", async () => {
    vi.mocked(prisma.appointment.updateMany).mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    await Promise.all([
      PATCH(request("COMPLETED"), { params: Promise.resolve({ id: base.id }) }),
      PATCH(request("COMPLETED"), { params: Promise.resolve({ id: base.id }) }),
    ]);
    expect(processLoyaltyStamps).toHaveBeenCalledTimes(1);
  });
});
