import { beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";

const mocks = vi.hoisted(() => ({
  businessFindUnique: vi.fn(),
  permissions: vi.fn(),
  agendaScope: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    business: { findUnique: mocks.businessFindUnique },
    businessLocation: { findMany: vi.fn(), findFirst: vi.fn() },
    service: { findMany: vi.fn(), findFirst: vi.fn() },
    staff: { findMany: vi.fn() },
  },
}));

vi.mock("@/server/services/permissions.service", () => ({
  getEffectiveBusinessPermissions: mocks.permissions,
}));

vi.mock("@/server/services/business.service", () => ({
  getStaffAgendaScope: mocks.agendaScope,
}));

vi.mock("@/server/services/appointment.service", () => ({
  getBlockedSlots: vi.fn(),
}));

import {
  buildAvailabilityStory,
  getAvailabilityStoryAccess,
} from "@/server/services/availability-story.service";

const worker = { id: "user-staff", role: "STAFF" };
const business = { id: "business-1", ownerId: "owner-1" };

describe("availability story staff scope", () => {
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
      serviceId: "service-1",
      locationId: "location-1",
      staffId: "staff-2",
      range: "TOMORROW",
      template: "GRADIENT",
      headline: "Horas disponibles",
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
});
