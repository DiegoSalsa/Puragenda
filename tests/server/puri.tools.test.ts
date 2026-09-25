import { beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";
import { formatTodayAppointmentTime } from "@/lib/zoned-appointment-time";
import type { PuriContext } from "@/server/puri/types";

const mocks = vi.hoisted(() => ({ today: vi.fn(), availability: vi.fn(), clients: vi.fn(), appointments: vi.fn() }));
vi.mock("@/server/services/today-dashboard.service", () => ({ loadTodayDashboard: mocks.today }));
vi.mock("@/server/services/dashboard-availability.service", () => ({ getDashboardAvailability: mocks.availability }));
vi.mock("@/server/services/availability-story.service", () => ({ getAvailabilityStoryInsights: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { client: { findMany: mocks.clients }, appointment: { findMany: mocks.appointments } } }));

import { executePuriTool, getAppointments, getAvailability, getRevenueSummary, getTodayOverview, searchClients } from "@/server/puri/tools";

function context(permissions: PuriContext["permissions"] = [P.APPOINTMENTS_VIEW_OWN]): PuriContext {
  return {
    user: { id: "user-1", role: "STAFF" },
    business: { id: "business-1", ownerId: "owner-1", name: "Test", slug: "test", timezone: "America/Santiago", currencyCode: "CLP", allowSameDayBookings: true, depositRequired: false, mpAccessToken: null, mpUserId: null },
    permissions, staffId: "staff-1", canSeeAllAgendas: false, ownAgenda: true,
    location: { id: "location-1", slug: "main", name: "Main", timezone: "America/Santiago", isPrimary: true },
    locationCount: 1, locale: "es", pathname: "/dashboard", selectedPeriod: "week",
  };
}

describe("Puri controlled tools", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reuses Hoy data while removing money fields for users without analytics permission", async () => {
    mocks.today.mockResolvedValue({ dateKey: "2026-09-25", timeZone: "America/Santiago", canSeeMoney: false, kpis: { appointments: 2, cancelled: 0, openSlots: 1, collected: 0, pending: 0, projected: 0 }, appointments: [], finished: {}, attention: [] });
    const result = await getTodayOverview(context());
    expect(mocks.today).toHaveBeenCalledWith(expect.objectContaining({ agenda: "mine", location: "main" }));
    expect(result.counts).toEqual({ appointments: 2, cancelled: 0 });
    expect(result.availability).toEqual({ totalOpeningsAcrossStaff: 1, featuredOpportunityTimes: 0, featuredTimes: [] });
    expect(JSON.stringify(result)).not.toContain("collected");
  });

  it("gives Puri exactly the local appointment hour used by Hoy", async () => {
    const startTime = "2026-09-25T15:00:00.000Z";
    mocks.today.mockResolvedValue({ dateKey: "2026-09-25", timeZone: "America/Santiago", canSeeMoney: false, kpis: { appointments: 1, cancelled: 0, openSlots: 0 }, appointments: [{ id: "appointment-1", customerName: "Matías", serviceName: "Corte", startTime, endTime: "2026-09-25T16:00:00.000Z", status: "CONFIRMED", phase: "next", paymentLabel: "due" }], finished: {}, attention: [], story: null });
    const result = await getTodayOverview(context());
    expect(result.appointments[0].start).toEqual({ utc: startTime, timezone: "America/Santiago", localDate: "2026-09-25", localTime: "12:00" });
    expect(result.appointments[0].start.localTime).toBe(formatTodayAppointmentTime(startTime, "America/Santiago"));
  });

  it("denies revenue without the matching analytics permission before querying", async () => {
    await expect(getRevenueSummary(context(), { period: "today" })).rejects.toThrow("FORBIDDEN");
    expect(mocks.appointments).not.toHaveBeenCalled();
  });

  it("scopes client lookup to the authenticated business", async () => {
    mocks.clients.mockResolvedValue([{ id: "client-1", name: "Camila" }]);
    await expect(searchClients(context(), { query: "Camila" })).rejects.toThrow("FORBIDDEN");
    const result = await searchClients(context([P.CLIENTS_MANAGE]), { query: "Camila" });
    expect(result.clients).toHaveLength(1);
    expect(mocks.clients).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: "business-1" }) }));
  });

  it("uses the real availability engine in the own agenda and sends only times", async () => {
    const date = format(toZonedTime(new Date(), "America/Santiago"), "yyyy-MM-dd");
    const startTime = fromZonedTime(`${date}T10:00:00`, "America/Santiago").toISOString();
    mocks.availability.mockResolvedValue({ timezone: "America/Santiago", serviceNames: ["Corte"], days: [{ slots: [{ time: "10:00", startTime, bookingOptions: [{ assignments: [{ staffId: "staff-1" }] }] }] }] });
    const result = await getAvailability(context(), { date });
    expect(mocks.availability).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ staffId: "staff-1", locationId: "location-1" }));
    expect(result).toMatchObject({ availableTimesCount: 1, times: [{ utc: startTime, localDate: date, localTime: "10:00" }] });
    expect(JSON.stringify(result)).not.toContain("assignments");
  });

  it("applies business, location and own-staff filters to appointments", async () => {
    mocks.appointments.mockResolvedValue([]);
    await getAppointments(context(), { period: "today" });
    expect(mocks.appointments).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: "business-1", staffId: "staff-1", OR: [{ locationId: "location-1" }, { locationId: null }] }) }));
  });

  it("routes only named tools and validates arguments", async () => {
    await expect(executePuriTool("runSQL", {}, context())).rejects.toThrow("UNKNOWN_TOOL");
    await expect(executePuriTool("getAppointments", { period: "all_time", status: null }, context())).rejects.toThrow();
  });
});
