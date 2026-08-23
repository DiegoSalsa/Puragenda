import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

const mocks = vi.hoisted(() => ({
  businessFindUnique: vi.fn(),
  locationFindFirst: vi.fn(),
  serviceFindMany: vi.fn(),
  staffFindMany: vi.fn(),
  appointmentFindMany: vi.fn(),
  scheduleBlockFindMany: vi.fn(),
  permissions: vi.fn(),
  agendaScope: vi.fn(),
  googleBusy: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    business: { findUnique: mocks.businessFindUnique },
    businessLocation: { findFirst: mocks.locationFindFirst },
    service: { findMany: mocks.serviceFindMany },
    staff: { findMany: mocks.staffFindMany },
    appointment: { findMany: mocks.appointmentFindMany },
    scheduleBlock: { findMany: mocks.scheduleBlockFindMany },
  },
}));

vi.mock("@/server/services/permissions.service", () => ({
  getEffectiveBusinessPermissions: mocks.permissions,
}));

vi.mock("@/server/services/business.service", () => ({
  getStaffAgendaScope: mocks.agendaScope,
}));

vi.mock("@/server/services/google-calendar.service", () => ({
  getGoogleCalendarBusySlots: mocks.googleBusy,
}));

import { getDashboardAvailability } from "@/server/services/dashboard-availability.service";

const user = { id: "owner-1", role: "ADMIN" };
const businessContext = { id: "business-1", ownerId: "owner-1" };

function weeklyHours(startTime = "09:00", endTime = "12:00") {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime,
    endTime,
    isOpen: true,
    breakStart: null,
    breakEnd: null,
  }));
}

function staffMember(id: string, serviceIds: string[], startTime = "09:00", endTime = "12:00") {
  return {
    id,
    name: id === "staff-1" ? "Camila" : "Diego",
    services: serviceIds.map((serviceId) => ({ id: serviceId })),
    schedule: weeklyHours(startTime, endTime).map((entry) => ({ ...entry, isWorking: true })),
    scheduleOverrides: [],
    locations: [{ locationId: "location-1", isActive: true, schedule: [] }],
  };
}

function service(id: string, duration: number) {
  return {
    id,
    name: id === "service-1" ? "Corte" : "Barba",
    duration,
    price: 20_000,
    staff: [],
    optionCategories: [],
  };
}

describe("dashboard availability service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T12:00:00.000Z"));
    vi.clearAllMocks();
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL]);
    mocks.agendaScope.mockResolvedValue({ canSeeAllAgendas: true, staffId: null, ownStaffId: null });
    mocks.businessFindUnique.mockResolvedValue({
      ...businessContext,
      maxServicesPerBooking: 3,
      allowSameDayBookings: false,
      minAdvanceBookingMinutes: 120,
      slotInterval: 60,
      subscription: { plan: "EQUIPO" },
      businessHours: weeklyHours(),
      scheduleOverrides: [],
    });
    mocks.locationFindFirst.mockResolvedValue({
      id: "location-1",
      businessId: businessContext.id,
      timezone: "UTC",
      hours: weeklyHours(),
      scheduleOverrides: [],
    });
    mocks.serviceFindMany.mockResolvedValue([service("service-1", 60)]);
    mocks.staffFindMany.mockResolvedValue([staffMember("staff-1", ["service-1"])]);
    mocks.appointmentFindMany.mockResolvedValue([]);
    mocks.scheduleBlockFindMany.mockResolvedValue([]);
    mocks.googleBusy.mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  it("returns only genuinely free times and batches appointment/block queries", async () => {
    mocks.appointmentFindMany.mockResolvedValue([{
      staffId: "staff-1",
      startTime: new Date("2026-08-14T10:00:00.000Z"),
      endTime: new Date("2026-08-14T11:00:00.000Z"),
    }]);

    const result = await getDashboardAvailability(user, businessContext, {
      mode: "services",
      locationId: "location-1",
      serviceIds: ["service-1"],
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-14",
      days: 1,
    });

    expect(result.days[0].slots.map((slot) => slot.time)).toEqual(["09:00", "11:00"]);
    expect(result.days[0].slots[0].bookingOptions[0].assignments).toEqual([{
      serviceId: "service-1",
      staffId: "staff-1",
      staffName: "Camila",
    }]);
    expect(mocks.appointmentFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleBlockFindMany).toHaveBeenCalledTimes(1);
  });

  it("applies the same-day advance cutoff", async () => {
    mocks.businessFindUnique.mockResolvedValue({
      ...businessContext,
      maxServicesPerBooking: 3,
      allowSameDayBookings: true,
      minAdvanceBookingMinutes: 120,
      slotInterval: 60,
      subscription: { plan: "EQUIPO" },
      businessHours: weeklyHours("09:00", "18:00"),
      scheduleOverrides: [],
    });
    mocks.locationFindFirst.mockResolvedValue({
      id: "location-1",
      businessId: businessContext.id,
      timezone: "UTC",
      hours: weeklyHours("09:00", "18:00"),
      scheduleOverrides: [],
    });
    mocks.staffFindMany.mockResolvedValue([staffMember("staff-1", ["service-1"], "09:00", "18:00")]);

    const result = await getDashboardAvailability(user, businessContext, {
      mode: "services",
      locationId: "location-1",
      serviceIds: ["service-1"],
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-13",
      days: 1,
    });

    expect(result.days[0].slots[0].time).toBe("15:00");
    expect(result.days[0].slots.some((slot) => slot.time === "14:00")).toBe(false);
  });

  it("intersects availability when services use different professionals", async () => {
    mocks.serviceFindMany.mockResolvedValue([
      service("service-1", 60),
      service("service-2", 120),
    ]);
    mocks.staffFindMany.mockResolvedValue([
      staffMember("staff-1", ["service-1"]),
      staffMember("staff-2", ["service-2"]),
    ]);

    const result = await getDashboardAvailability(user, businessContext, {
      mode: "services",
      locationId: "location-1",
      serviceIds: ["service-1", "service-2"],
      staffAssignments: [
        { serviceId: "service-1", staffId: "staff-1" },
        { serviceId: "service-2", staffId: "staff-2" },
      ],
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-14",
      days: 1,
    });

    expect(result.durationMinutes).toBe(120);
    expect(result.days[0].slots.map((slot) => slot.time)).toEqual(["09:00", "10:00"]);
    expect(result.days[0].slots[0].bookingOptions[0].assignments).toHaveLength(2);
  });

  it("does not let an own-agenda user query another professional", async () => {
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN]);
    mocks.agendaScope.mockResolvedValue({ canSeeAllAgendas: false, staffId: "staff-1", ownStaffId: "staff-1" });

    await expect(getDashboardAvailability(
      { id: "worker-1", role: "STAFF" },
      businessContext,
      {
        mode: "services",
        locationId: "location-1",
        serviceIds: ["service-1"],
        staffId: "staff-2",
        selectedOptionAlternativeIds: [],
        fromDate: "2026-08-14",
        days: 1,
      },
    )).rejects.toMatchObject({
      code: "STAFF_FORBIDDEN",
      status: 403,
    });
  });

  it("returns the next free agenda times without requiring service configuration", async () => {
    mocks.staffFindMany.mockResolvedValue([
      staffMember("staff-1", ["service-1"]),
      staffMember("staff-2", ["service-1"]),
    ]);
    mocks.appointmentFindMany.mockResolvedValue([{
      staffId: "staff-1",
      startTime: new Date("2026-08-14T09:00:00.000Z"),
      endTime: new Date("2026-08-14T10:00:00.000Z"),
    }]);

    const result = await getDashboardAvailability(user, businessContext, {
      mode: "overview",
      locationId: "location-1",
      serviceIds: [],
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-14",
      days: 1,
    });

    expect(mocks.serviceFindMany).not.toHaveBeenCalled();
    expect(result.serviceNames).toEqual([]);
    expect(result.durationMinutes).toBe(60);
    expect(result.days[0].slots.map((slot) => slot.time)).toEqual(["09:00", "10:00", "11:00"]);
  });
  it("uses only the requested professional schedule in the overview", async () => {
    const unavailableOnMonday = staffMember("staff-1", ["service-1"]);
    unavailableOnMonday.schedule = unavailableOnMonday.schedule.map((entry) =>
      entry.dayOfWeek === 1 ? { ...entry, isWorking: false } : entry,
    );
    mocks.staffFindMany.mockResolvedValue([
      unavailableOnMonday,
      staffMember("staff-2", ["service-1"]),
    ]);

    const result = await getDashboardAvailability(user, businessContext, {
      mode: "overview",
      locationId: "location-1",
      serviceIds: [],
      staffId: "staff-1",
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-17",
      days: 1,
    });

    expect(result.days[0].slots).toEqual([]);
  });

  it("uses the business schedule instead of the professional schedule for Individual", async () => {
    const unavailableOnMonday = staffMember("staff-1", ["service-1"]);
    unavailableOnMonday.schedule = unavailableOnMonday.schedule.map((entry) =>
      entry.dayOfWeek === 1 ? { ...entry, isWorking: false } : entry,
    );
    mocks.businessFindUnique.mockResolvedValue({
      ...businessContext,
      maxServicesPerBooking: 3,
      allowSameDayBookings: false,
      minAdvanceBookingMinutes: 120,
      slotInterval: 60,
      subscription: { plan: "INDIVIDUAL" },
      businessHours: weeklyHours(),
      scheduleOverrides: [],
    });
    mocks.staffFindMany.mockResolvedValue([unavailableOnMonday]);

    const result = await getDashboardAvailability(user, businessContext, {
      mode: "overview",
      locationId: "location-1",
      serviceIds: [],
      staffId: "staff-1",
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-17",
      days: 1,
    });

    expect(result.days[0].slots.map((slot) => slot.time)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("does not let an own-agenda user request another professional overview", async () => {
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN]);
    mocks.agendaScope.mockResolvedValue({ canSeeAllAgendas: false, staffId: "staff-1", ownStaffId: "staff-1" });

    await expect(getDashboardAvailability(
      { id: "worker-1", role: "STAFF" },
      businessContext,
      {
        mode: "overview",
        locationId: "location-1",
        serviceIds: [],
        staffId: "staff-2",
        selectedOptionAlternativeIds: [],
        fromDate: "2026-08-17",
        days: 1,
      },
    )).rejects.toMatchObject({
      code: "STAFF_FORBIDDEN",
      status: 403,
    });
  });
});
