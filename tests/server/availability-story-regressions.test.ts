import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { normalizeStoryConfiguration, storyAvailabilityKey } from "@/core/story-configuration";
import { availabilityStoryRequestSchema } from "@/server/validations/availability-story";

const mocks = vi.hoisted(() => ({
  business: vi.fn(), location: vi.fn(), services: vi.fn(), staff: vi.fn(), blocked: vi.fn(),
  permissions: vi.fn(), scope: vi.fn(), storage: vi.fn(), campaignAggregate: vi.fn(),
  campaigns: vi.fn(), appointmentAggregate: vi.fn(), activity: vi.fn(), presets: vi.fn(),
  presetFind: vi.fn(), presetDelete: vi.fn(), presetUpsert: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  business: { findUnique: mocks.business }, businessLocation: { findFirst: mocks.location },
  service: { findMany: mocks.services }, staff: { findMany: mocks.staff }, $queryRaw: mocks.storage,
  storyCampaign: { aggregate: mocks.campaignAggregate, findMany: mocks.campaigns, updateMany: mocks.activity },
  appointment: { aggregate: mocks.appointmentAggregate }, storyPreset: { findMany: mocks.presets, deleteMany: mocks.presetDelete },
  $transaction: mocks.transaction,
} }));
vi.mock("@/server/services/permissions.service", () => ({ getEffectiveBusinessPermissions: mocks.permissions }));
vi.mock("@/server/services/business.service", () => ({ getStaffAgendaScope: mocks.scope }));
vi.mock("@/server/services/appointment.service", () => ({ getBlockedSlots: mocks.blocked }));
import { buildAvailabilityStory, deleteAvailabilityStoryPreset, getAvailabilityStoryInsights, getAvailabilityStoryPresets, recordAvailabilityStoryActivity, saveAvailabilityStoryPreset } from "@/server/services/availability-story.service";

const owner = { id: "owner", role: "ADMIN" };
const business = { id: "business", ownerId: "owner" };
const request = availabilityStoryRequestSchema.parse({
  locationId: "location", allServices: true, range: "CUSTOM", targetDate: "2026-08-10", endDate: "2026-08-10",
  template: "AURORA", accentColor: "#7C3AED", secondaryColor: "#5B21B6", canvasColor: "#FFFFFF", storyTextColor: "#171717",
});

describe("availability story regressions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T12:00:00Z"));
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_ALL]);
    mocks.scope.mockResolvedValue({ ownStaffId: "staff-1", canSeeAllAgendas: true });
    const hours = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00", isOpen: true }));
    mocks.business.mockResolvedValue({ ...business, name: "Demo", slug: "demo", logoUrl: null, locale: "es", subscription: { plan: "INDIVIDUAL" }, businessHours: hours, scheduleOverrides: [], allowSameDayBookings: false, slotInterval: 30, minAdvanceBookingMinutes: 120 });
    mocks.location.mockResolvedValue({ id: "location", slug: "main", name: "Principal", timezone: "America/Santiago", hours, scheduleOverrides: [] });
    mocks.services.mockResolvedValue([{ id: "service", name: "Sesión", duration: 60, price: 20000, staff: [] }]);
    mocks.staff.mockResolvedValue([{ id: "staff-1", name: "Ana", schedule: [], scheduleOverrides: [], locations: [{ schedule: [] }] }]);
    mocks.blocked.mockResolvedValue([]);
    mocks.storage.mockResolvedValue([{ tableName: "exists" }]);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("ignores hidden dates when moving from a custom period to upcoming availability", async () => {
    const data = await buildAvailabilityStory(owner, business.id, { ...request, range: "NEXT_AVAILABLE", targetDate: "2020-01-01", endDate: "2020-01-02" });
    expect(data.days).toHaveLength(5);
    expect(data.days[0].date).toBe("2026-08-09");
    expect(new URL(data.bookingUrl).searchParams.get("date")).toBe("2026-08-09");
  });

  it("generates a promotion without schedules despite old dates and exclusions", async () => {
    const data = await buildAvailabilityStory(owner, business.id, { ...request, showSchedule: false, targetDate: "2020-01-01", endDate: undefined, excludedDates: ["2026-08-08"], selectedSlots: [{ date: "2020-01-01", time: "10:00" }] });
    expect(data.days).toEqual([]);
    expect(data.showSchedule).toBe(false);
    expect(mocks.blocked).not.toHaveBeenCalled();
    expect(new URL(data.bookingUrl).searchParams.has("date")).toBe(false);
  });

  it("keeps an explicitly selected time beyond the default display sample", async () => {
    const data = await buildAvailabilityStory(owner, business.id, { ...request, selectedSlots: [{ date: "2026-08-10", time: "17:00" }] });
    expect(data.days[0].times).toEqual(["17:00"]);
    expect(data.slotCount).toBe(1);
  });

  it("still rejects booked slots when the user explicitly selects them", async () => {
    mocks.blocked.mockResolvedValue([{ startTime: new Date("2026-08-10T21:00:00Z"), endTime: new Date("2026-08-10T22:00:00Z") }]);
    const data = await buildAvailabilityStory(owner, business.id, { ...request, selectedSlots: [{ date: "2026-08-10", time: "17:00" }] });
    expect(data.days[0].times).toEqual([]);
    expect(data.slotCount).toBe(0);
  });

  it("retains service data when labels are hidden so showing them again works", async () => {
    const data = await buildAvailabilityStory(owner, business.id, { ...request, showServices: false });
    expect(data.serviceNames).toEqual(["Sesión"]);
    expect(data.showServices).toBe(false);
  });

  it("keeps availability keys independent of design and invalidates another mode or professional", () => {
    expect(storyAvailabilityKey({ ...request, headline: "Otro título", showServices: false })).toBe(storyAvailabilityKey(request));
    expect(storyAvailabilityKey({ ...request, showSchedule: false })).not.toBe(storyAvailabilityKey(request));
    expect(storyAvailabilityKey({ ...request, staffId: "staff-2" })).not.toBe(storyAvailabilityKey(request));
    expect(normalizeStoryConfiguration({ ...request, range: "TOMORROW" }).targetDate).toBeUndefined();
  });

  it("does not require hidden custom dates, but still validates a visible custom range", () => {
    expect(availabilityStoryRequestSchema.safeParse({ ...request, showSchedule: false, endDate: undefined }).success).toBe(true);
    expect(availabilityStoryRequestSchema.safeParse({ ...request, endDate: undefined }).success).toBe(false);
  });

  it("accepts the slot selection produced by a 90-day calendar", () => {
    const slots = Array.from({ length: 90 }, (_, day) => ["09:00", "10:00", "11:00", "12:00"].map(time => ({
      date: new Date(Date.UTC(2026, 7, 10 + day)).toISOString().slice(0, 10), time,
    }))).flat().slice(1);
    expect(availabilityStoryRequestSchema.safeParse({ ...request, selectedSlots: slots }).success).toBe(true);
    expect(availabilityStoryRequestSchema.safeParse({ ...request, selectedSlots: [...slots, ...slots] }).success).toBe(false);
  });

  it("scopes history, metrics and activity to the professional with own-agenda access", async () => {
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN]);
    mocks.campaignAggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: {} });
    mocks.appointmentAggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: {} });
    mocks.campaigns.mockResolvedValue([]);
    mocks.activity.mockResolvedValue({ count: 0 });
    await getAvailabilityStoryInsights({ id: "staff-user", role: "STAFF" }, business);
    expect(mocks.campaignAggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: business.id, staffId: "staff-1", status: "PUBLISHED" } }));
    expect(mocks.campaigns).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: business.id, staffId: "staff-1" } }));
    expect(mocks.appointmentAggregate.mock.calls[0][0].where.storyCampaign.staffId).toBe("staff-1");
    await expect(recordAvailabilityStoryActivity({ id: "staff-user", role: "STAFF" }, business, "someone-elses-campaign", "archive")).rejects.toThrow("STORY_CAMPAIGN_NOT_FOUND");
    expect(mocks.activity.mock.calls[0][0].where.staffId).toBe("staff-1");
  });

  it("validates saved presets and excludes other professionals' configurations", async () => {
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN]);
    const entry = { id: "preset", name: "Demo", isDefault: true, updatedAt: new Date() };
    mocks.presets.mockResolvedValue([
      { ...entry, configuration: [] },
      { ...entry, configuration: { ...request, staffId: "staff-2" } },
      { ...entry, configuration: { ...request, staffId: "staff-1" } },
    ]);
    const presets = await getAvailabilityStoryPresets({ id: "staff-user", role: "STAFF" }, business);
    expect(presets).toHaveLength(1);
    expect(presets[0].configuration.staffId).toBe("staff-1");
  });

  it("prevents overwriting another professional's preset by guessing its name", async () => {
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN]);
    mocks.presetFind.mockResolvedValue({ configuration: { ...request, staffId: "staff-2" } });
    mocks.transaction.mockImplementation(callback => callback({ storyPreset: { findUnique: mocks.presetFind, upsert: mocks.presetUpsert } }));
    await expect(saveAvailabilityStoryPreset({ id: "staff-user", role: "STAFF" }, business, {
      name: "Compartido", configuration: { ...request, staffId: "staff-1" }, isDefault: false,
    })).rejects.toThrow("STORY_STAFF_SCOPE_FORBIDDEN");
    expect(mocks.presetUpsert).not.toHaveBeenCalled();
  });

  it("prevents deleting another professional's preset", async () => {
    mocks.permissions.mockResolvedValue([DASHBOARD_PERMISSIONS.APPOINTMENTS_VIEW_OWN]);
    mocks.presetDelete.mockResolvedValue({ count: 0 });
    await expect(deleteAvailabilityStoryPreset({ id: "staff-user", role: "STAFF" }, business, "other-preset")).rejects.toThrow("STORY_PRESET_NOT_FOUND");
    expect(mocks.presetDelete).toHaveBeenCalledWith({ where: { id: "other-preset", businessId: business.id, configuration: { path: ["staffId"], equals: "staff-1" } } });
  });
});
