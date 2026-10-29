import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const effects = vi.hoisted(() => ({ sync: vi.fn(), email: vi.fn(), busy: vi.fn(), afterResolve: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: async () => ({ id: "agenda-owner", role: "ADMIN" }) }));
vi.mock("@/server/email/send", () => ({ sendConfirmationEmail: effects.email, sendCancellationEmail: effects.email, sendAppointmentActionStaffNotification: effects.email }));
vi.mock("@/server/services/google-calendar.service", () => ({ syncAppointmentToGoogle: effects.sync, removeAppointmentFromGoogle: vi.fn(), getGoogleCalendarBusySlots: effects.busy }));
vi.mock("@/server/services/appointment-management.service", async importOriginal => {
  const actual = await importOriginal<typeof import("@/server/services/appointment-management.service")>();
  return { ...actual, resolveManagedAppointment: async (...args: Parameters<typeof actual.resolveManagedAppointment>) => {
    const result = await actual.resolveManagedAppointment(...args);
    if ("value" in result) await effects.afterResolve();
    return result;
  } };
});

import { prisma } from "@/server/db/prisma";
import { POST } from "@/app/api/dashboard/appointments/route";
import { PUT } from "@/app/api/dashboard/appointments/[id]/route";
import { getDashboardAvailability } from "@/server/services/dashboard-availability.service";
import { getBookingAvailability, loadBookingContext } from "@/server/booking/read.service";

const url = process.env.PURAGENDA_BOOKING_TEST_DATABASE_URL;
const enabled = !!url && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)
  && new URL(url).pathname === "/puragenda_booking_api_test" && /^booking_api_test_\d+$/.test(new URL(url).searchParams.get("schema") ?? "");
const businessId = "agenda-business";
const owner = { id: "agenda-owner", role: "ADMIN" };
const business = { id: businessId, ownerId: owner.id };
const payload = { customerName: "Agenda Fixture", customerEmail: "agenda@example.invalid", customerPhone: "+56911111111", serviceId: "agenda-service",
  staffId: "agenda-staff-b", locationId: "agenda-b", startTime: "2026-10-01T13:00:00.000Z", selectedOptionAlternativeIds: [], sendConfirmation: true };
function request(method: "POST" | "PUT", changes: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/dashboard/appointments", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, ...changes }) });
}
async function appointment() {
  return prisma.appointment.create({ data: { id: "agenda-appointment", businessId, locationId: "agenda-b", staffId: "agenda-staff-b", serviceId: "agenda-service",
    customerName: payload.customerName, customerEmail: payload.customerEmail, startTime: new Date(payload.startTime), endTime: new Date("2026-10-01T13:30:00Z"),
    totalDuration: 30, totalPrice: 10000 } });
}
async function put(id: string, changes: Record<string, unknown>) { return PUT(request("PUT", changes), { params: Promise.resolve({ id }) }); }
async function compareSlots() {
  const context = await loadBookingContext(businessId);
  const external = await getBookingAvailability(context, { date: "2026-10-01", serviceId: payload.serviceId, staffId: payload.staffId, locationId: payload.locationId, selectedOptionAlternativeIds: [] }, new Date());
  const internal = await getDashboardAvailability(owner, business, { mode: "services", locationId: payload.locationId, serviceIds: [payload.serviceId], staffId: payload.staffId,
    selectedOptionAlternativeIds: [], fromDate: "2026-10-01", days: 1 });
  const publicStarts = external.slots.map(s => s.startTime);
  expect(internal.days[0].slots.map(s => s.startTime)).toEqual(publicStarts);
  return publicStarts;
}

describe.skipIf(!enabled)("dashboard appointments with real isolated PostgreSQL capacity guards", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T12:00:00Z"));
    effects.sync.mockResolvedValue({ synced: true }); effects.email.mockResolvedValue(undefined); effects.busy.mockResolvedValue([]); effects.afterResolve.mockReset();
    await prisma.business.deleteMany({ where: { id: businessId } });
    await prisma.user.upsert({ where: { id: owner.id }, update: {}, create: { id: owner.id, email: "agenda-owner@example.invalid", password: "synthetic-disabled-login", name: "Agenda Owner", role: "ADMIN" } });
    await prisma.business.create({ data: { id: businessId, ownerId: owner.id, apiKey: "agenda-local-fixture-key", slug: "agenda-fixture", name: "Agenda Fixture", timezone: "UTC", slotInterval: 30, allowSameDayBookings: true,
      subscription: { create: { plan: "EQUIPO", status: "ACTIVE" } },
      locations: { create: [
        { id: "agenda-a", name: "A", slug: "a", timezone: "UTC", isPrimary: true, isActive: true, hours: { create: [{ dayOfWeek: 4, isOpen: true, startTime: "09:00", endTime: "11:00" }] } },
        { id: "agenda-b", name: "B", slug: "b", timezone: "America/Santiago", isActive: true, hours: { create: [{ dayOfWeek: 4, isOpen: true, startTime: "10:00", endTime: "12:00", breakStart: "11:00", breakEnd: "11:30" }] } },
      ] },
      services: { create: { id: "agenda-service", name: "Service", price: 10000, duration: 30, locations: { create: [{ locationId: "agenda-a" }, { locationId: "agenda-b" }] } } },
    } });
    for (const branch of ["a", "b"]) await prisma.staff.create({ data: { id: `agenda-staff-${branch}`, name: `Staff ${branch}`, businessId,
      services: { connect: { id: payload.serviceId } }, locations: { create: { locationId: `agenda-${branch}` } } } });
  });
  afterEach(() => vi.useRealTimers());
  afterAll(async () => { await prisma.business.deleteMany({ where: { id: businessId } }); await prisma.user.deleteMany({ where: { id: owner.id } }); await prisma.$disconnect(); });

  it("persists the chosen branch using its timezone and shares the public slots", async () => {
    expect(await compareSlots()).toEqual(["2026-10-01T13:00:00.000Z", "2026-10-01T13:30:00.000Z", "2026-10-01T14:30:00.000Z"]);
    const response = await POST(request("POST")); expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ locationId: "agenda-b", startTime: payload.startTime });
    expect(await compareSlots()).not.toContain(payload.startTime);
  });
  it.each([
    { locationId: undefined }, { staffId: "agenda-staff-a" }, { startTime: "2026-10-01T12:00:00.000Z" },
    { startTime: "2026-10-01T14:00:00.000Z" }, { startTime: "2026-10-02T13:00:00.000Z" }, { locationId: "foreign-location" },
  ])("rejects ambiguous, unassigned, closed and foreign branch input: %j", async changes => {
    expect((await POST(request("POST", changes))).status).toBe(409);
    expect(await prisma.appointment.count({ where: { businessId } })).toBe(0);
    expect(await prisma.client.count({ where: { businessId } })).toBe(0);
    expect(effects.sync).not.toHaveBeenCalled(); expect(effects.email).not.toHaveBeenCalled();
  });
  it("rejects services not assigned to the branch", async () => {
    await prisma.locationService.deleteMany({ where: { locationId: "agenda-b" } });
    expect((await POST(request("POST"))).status).toBe(409);
  });
  it("preserves old single-location requests without requiring a new field", async () => {
    await prisma.businessLocation.delete({ where: { id: "agenda-a" } });
    const response = await POST(request("POST", { locationId: undefined }));
    expect(response.status).toBe(201); expect(await response.json()).toMatchObject({ locationId: "agenda-b" });
  });
  it("preserves zero-location legacy manual creation", async () => {
    await prisma.businessLocation.deleteMany({ where: { businessId } });
    expect((await POST(request("POST", { locationId: undefined }))).status).toBe(201);
  });
  it("returns 409 for stale or absent edit versions without changing any rows", async () => {
    const original = await appointment();
    for (const expectedUpdatedAt of [undefined, "2026-01-01T00:00:00.000Z"]) expect((await put(original.id, { expectedUpdatedAt })).status).toBe(409);
    expect(await prisma.appointment.findUnique({ where: { id: original.id } })).toEqual(original);
    expect(await prisma.client.count({ where: { businessId } })).toBe(0);
  });
  it("serializes concurrent edits, rolls back the loser and advances the version even within one millisecond", async () => {
    const original = await appointment();
    const results = await Promise.all(["first", "second"].map(name => put(original.id, { expectedUpdatedAt: original.updatedAt.toISOString(), customerEmail: `${name}@example.invalid`, internalNotes: name })));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = await prisma.appointment.findUniqueOrThrow({ where: { id: original.id } });
    expect(winner.customerEmail).toBe(`${winner.internalNotes}@example.invalid`);
    expect(await prisma.client.count({ where: { businessId } })).toBe(1);
    expect(effects.sync).toHaveBeenCalledTimes(1); expect(effects.email).toHaveBeenCalledTimes(1);
    const next = await put(original.id, { expectedUpdatedAt: winner.updatedAt.toISOString(), customerEmail: winner.customerEmail });
    expect(next.status).toBe(200);
    expect(new Date((await next.json()).updatedAt).getTime()).toBeGreaterThan(winner.updatedAt.getTime());
  });
  it("maps an actual PostgreSQL trigger conflict after validation to 409 and rolls back client writes", async () => {
    const original = await appointment();
    effects.afterResolve.mockImplementationOnce(async () => {
      await prisma.appointment.create({ data: { businessId, locationId: "agenda-b", staffId: payload.staffId, serviceId: payload.serviceId,
        customerName: "Concurrent", customerEmail: "concurrent@example.invalid", startTime: new Date("2026-10-01T14:30:00Z"), endTime: new Date("2026-10-01T15:00:00Z") } });
    });
    const response = await put(original.id, { expectedUpdatedAt: original.updatedAt.toISOString(), startTime: "2026-10-01T14:30:00.000Z", customerEmail: "loser@example.invalid" });
    expect(response.status).toBe(409);
    expect(await prisma.appointment.findUnique({ where: { id: original.id } })).toEqual(original);
    expect(await prisma.client.count({ where: { businessId } })).toBe(0); expect(effects.sync).not.toHaveBeenCalled();
  });
  it("validates and persists a move to a different branch", async () => {
    const original = await appointment();
    const response = await put(original.id, { expectedUpdatedAt: original.updatedAt.toISOString(), locationId: "agenda-a", staffId: "agenda-staff-a", startTime: "2026-10-01T09:00:00.000Z" });
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ locationId: "agenda-a", staffId: "agenda-staff-a" });
  });
  it("shares blocked dates, staff overrides and branch blocks with public availability", async () => {
    await prisma.blockedDate.create({ data: { businessId, date: new Date("2026-10-01T00:00:00Z") } });
    expect(await compareSlots()).toEqual([]); expect((await POST(request("POST"))).status).toBe(409);
    await prisma.blockedDate.deleteMany({ where: { businessId } });
    await prisma.staffScheduleOverride.create({ data: { staffId: payload.staffId, date: new Date("2026-10-01T00:00:00Z"), isWorking: false } });
    expect(await compareSlots()).toEqual([]); expect((await POST(request("POST"))).status).toBe(409);
    await prisma.staffScheduleOverride.deleteMany({ where: { staffId: payload.staffId } });
    await prisma.scheduleBlock.create({ data: { staffId: payload.staffId, locationId: payload.locationId, type: "UNAVAILABLE", startTime: new Date("2026-10-01T13:00:00Z"), endTime: new Date("2026-10-01T15:00:00Z") } });
    expect(await compareSlots()).toEqual([]); expect((await POST(request("POST"))).status).toBe(409);
  });
  it("shares null-staff occupancy, rejected payments and expired holds", async () => {
    const original = await appointment();
    await prisma.appointment.update({ where: { id: original.id }, data: { staffId: null } });
    expect(await compareSlots()).not.toContain(payload.startTime);
    await prisma.appointment.update({ where: { id: original.id }, data: { paymentStatus: "REJECTED" } });
    expect(await compareSlots()).toContain(payload.startTime);
    await prisma.appointment.update({ where: { id: original.id }, data: { paymentStatus: "PENDING", status: "AWAITING_PAYMENT", paymentHoldExpiresAt: new Date("2026-09-30T11:00:00Z") } });
    expect(await compareSlots()).toContain(payload.startTime);
    expect(await prisma.appointment.findUnique({ where: { id: original.id } })).toMatchObject({ status: "CANCELLED", paymentStatus: "PENDING" });
  });
  it("falls back to global staff hours when the branch assignment has no custom hours", async () => {
    await prisma.staffSchedule.create({ data: { staffId: payload.staffId, dayOfWeek: 4, startTime: "10:00", endTime: "10:30", isWorking: true } });
    expect(await compareSlots()).toEqual([payload.startTime]);
  });
  it("shares Google busy intervals and passes business context for legacy connections", async () => {
    effects.busy.mockResolvedValue([{ startTime: new Date("2026-10-01T13:00:00Z"), endTime: new Date("2026-10-01T15:00:00Z") }]);
    expect(await compareSlots()).toEqual([]); expect((await POST(request("POST"))).status).toBe(409);
    expect(effects.busy).toHaveBeenCalledWith(payload.staffId, expect.any(Date), expect.any(Date), businessId);
  });
  it("applies global closures on dates without a branch override", async () => {
    await prisma.businessScheduleOverride.create({ data: { businessId, date: new Date("2026-10-01T00:00:00Z"), isOpen: false } });
    await prisma.locationScheduleOverride.create({ data: { locationId: payload.locationId, date: new Date("2026-10-02T00:00:00Z"), isOpen: true, startTime: "10:00", endTime: "12:00" } });
    expect(await compareSlots()).toEqual([]);
    expect((await POST(request("POST"))).status).toBe(409);
    await prisma.locationScheduleOverride.create({ data: { locationId: payload.locationId, date: new Date("2026-10-01T00:00:00Z"), isOpen: true, startTime: "10:00", endTime: "12:00" } });
    expect(await compareSlots()).toContain(payload.startTime);
    expect((await POST(request("POST"))).status).toBe(201);
  });
});
