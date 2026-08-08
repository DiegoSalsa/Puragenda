import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

const mocks = vi.hoisted(() => ({
  businessFindUnique: vi.fn(),
  businessLocationFindMany: vi.fn(),
  serviceFindMany: vi.fn(),
  staffFindMany: vi.fn(),
  blockedSlots: vi.fn(),
  permissions: vi.fn(),
  agendaScope: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    business: { findUnique: mocks.businessFindUnique },
    businessLocation: { findMany: mocks.businessLocationFindMany, findFirst: vi.fn() },
    service: { findMany: mocks.serviceFindMany, findFirst: vi.fn() },
    staff: { findMany: mocks.staffFindMany },
  },
}));

vi.mock("@/server/services/permissions.service", () => ({
  getEffectiveBusinessPermissions: mocks.permissions,
}));

vi.mock("@/server/services/business.service", () => ({
  getStaffAgendaScope: mocks.agendaScope,
}));

vi.mock("@/server/services/appointment.service", () => ({
  getBlockedSlots: mocks.blockedSlots,
}));

import {
  buildAvailabilityStory,
  getAvailabilityStoryAccess,
  getAvailabilityStoryOpportunities,
} from "@/server/services/availability-story.service";

const worker = { id: "user-staff", role: "STAFF" };
const business = { id: "business-1", ownerId: "owner-1" };

describe("availability story staff scope", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN]);
    mocks.agendaScope.mockResolvedValue({ canSeeAllAgendas: false, staffId: "staff-1", ownStaffId: "staff-1" });
  });

  it("allows a professional to generate from their own agenda", async () => {
    await expect(getAvailabilityStoryAccess(worker, business)).resolves.toEqual({
      allowed: true,
      canChooseStaff: false,
      ownStaffId: "staff-1",
    });
  });

  it("rejects a manipulated request for another professional before querying availability", async () => {
    mocks.businessFindUnique.mockResolvedValue({
      ...business,
      businessHours: [],
      scheduleOverrides: [],
    });

    await expect(buildAvailabilityStory(worker, business.id, {
      serviceIds: ["service-1"],
      allServices: false,
      locationId: "location-1",
      staffId: "staff-2",
      range: "TOMORROW",
      excludedDates: [],
      selectedSlots: [],
      template: "AURORA",
      objective: "FILL_SLOTS",
      headline: "Horas disponibles",
      backgroundMode: "ART",
      accentColor: "#7C3AED",
      secondaryColor: "#5B21B6",
      canvasColor: "#F8FAFC",
      storyTextColor: "#171717",
      artIntensity: 0.38,
      fontStyle: "MODERN",
      logoFit: "CONTAIN",
      showLogo: true,
      showServices: true,
      showSchedule: true,
      showProfessional: true,
      showLocationName: true,
      showAddress: false,
      ctaMode: "LINK_STICKER" as const,
    })).rejects.toThrow("STORY_STAFF_SCOPE_FORBIDDEN");
  });

  it("lets a user with all-agendas permission choose the team", async () => {
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL]);
    mocks.agendaScope.mockResolvedValue({ canSeeAllAgendas: true, staffId: null, ownStaffId: "staff-1" });

    await expect(getAvailabilityStoryAccess({ id: "owner-1", role: "ADMIN" }, business)).resolves.toEqual({
      allowed: true,
      canChooseStaff: true,
      ownStaffId: "staff-1",
    });
  });

  it("discovers a manual calendar opening beyond the next seven days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T12:00:00.000Z"));
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL]);
    mocks.agendaScope.mockResolvedValue({ canSeeAllAgendas: true, staffId: null, ownStaffId: "staff-1" });
    const closedWeek = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      startTime: "09:00",
      endTime: "18:00",
      isOpen: false,
    }));
    const date = new Date("2026-08-20T00:00:00.000Z");
    mocks.businessFindUnique.mockResolvedValue({
      ...business,
      locale: "es",
      allowSameDayBookings: false,
      minAdvanceBookingMinutes: 120,
      slotInterval: 60,
      businessHours: closedWeek,
      scheduleOverrides: [],
    });
    mocks.businessLocationFindMany.mockResolvedValue([{
      id: "location-1",
      name: "Consulta",
      timezone: "America/Santiago",
      hours: closedWeek,
      scheduleOverrides: [{ date, isOpen: true, startTime: "10:00", endTime: "13:00", breakStart: null, breakEnd: null }],
    }]);
    mocks.serviceFindMany.mockResolvedValue([{
      id: "service-1",
      name: "Sesión",
      duration: 60,
      price: 25_000,
      locations: [{ locationId: "location-1" }],
      staff: [{ id: "staff-1" }],
    }]);
    mocks.staffFindMany.mockResolvedValue([{
      id: "staff-1",
      name: "Camila",
      schedule: closedWeek.map((entry) => ({ ...entry, isWorking: false })),
      scheduleOverrides: [{ date, isWorking: true, startTime: "10:00", endTime: "13:00", breakStart: null, breakEnd: null }],
      locations: [{ locationId: "location-1", schedule: [] }],
    }]);
    mocks.blockedSlots.mockResolvedValue([]);

    const opportunities = await getAvailabilityStoryOpportunities(
      { id: "owner-1", role: "ADMIN" },
      business,
    );

    expect(opportunities[0]).toMatchObject({
      date: "2026-08-20",
      source: "EXPLICIT",
      slotCount: 3,
      potentialRevenue: 75_000,
    });
  });
});
