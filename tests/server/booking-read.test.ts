import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { bookingFixture } from "../fixtures/booking-catalog";

const mocks = vi.hoisted(() => ({ business: vi.fn(), context: vi.fn(), blockedDate: vi.fn(), busy: vi.fn(), limiter: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { business: { findUniqueOrThrow: mocks.context }, blockedDate: { findUnique: mocks.blockedDate } } }));
vi.mock("@/server/services/business.service", () => ({ getBusinessBySlug: mocks.business, validateApiKey: (b: { apiKey: string }, key: string) => b.apiKey === key }));
vi.mock("@/server/services/appointment.service", () => ({ getBlockedSlots: mocks.busy }));
vi.mock("@/server/lib/rate-limit", () => ({ rateLimit: () => ({ check: mocks.limiter }) }));
import { GET as catalog } from "@/app/api/business/[slug]/booking-catalog/route";
import { GET as availability } from "@/app/api/business/[slug]/availability/route";
import { getBookingAvailability, toBookingCatalog } from "@/server/booking/read.service";

const context = { params: Promise.resolve({ slug: "fixture" }) };
const now = new Date("2026-09-30T12:00:00Z");
function request(query = "", key = "fixture-public-key") {
  return new NextRequest(`http://localhost/api/business/fixture/availability${query}`, { headers: { "x-api-key": key } });
}
describe("public booking reads", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    mocks.business.mockResolvedValue({ id: "business-1", apiKey: "fixture-public-key", subscription: { status: "ACTIVE" } });
    mocks.context.mockImplementation(async () => bookingFixture());
    mocks.blockedDate.mockResolvedValue(null); mocks.busy.mockResolvedValue([]); mocks.limiter.mockReturnValue(null);
  });
  it("requires the business key and does not load the catalog for unauthorized users", async () => {
    const response = await catalog(request("", "another-business-key"), context);
    expect(response.status).toBe(401); expect(mocks.context).not.toHaveBeenCalled();
  });
  it("rejects missing business and non-operational subscriptions", async () => {
    mocks.business.mockResolvedValueOnce(null);
    expect((await catalog(request(), context)).status).toBe(404);
    mocks.business.mockResolvedValueOnce({ apiKey: "fixture-public-key", subscription: { status: "INACTIVE" } });
    expect((await catalog(request(), context)).status).toBe(403);
  });
  it("returns explicit DTOs without keys, schedules, tokens or contacts", async () => {
    const response = await catalog(request(), context);
    const body = await response.json();
    expect(body.business).toEqual({ id: "business-1", slug: "fixture", name: "Fixture", timezone: "America/Santiago", currency: "CLP" });
    expect(JSON.stringify(body)).not.toMatch(/never-serialize|apiKey|mpAccessToken|"schedule"|customerEmail/);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.context.mock.calls[0][0].select.services.where).toMatchObject({ bookingMode: "APPOINTMENT", recurringPlan: { is: null } });
  });
  it("represents a business agenda without inventing staff", async () => {
    const data = bookingFixture(); data.subscription!.plan = "INDIVIDUAL";
    expect(toBookingCatalog(data)).toMatchObject({ staff: [], rules: { scheduleMode: "BUSINESS", staffSelection: "NONE" } });
    const result = await getBookingAvailability(data, { date: "2026-10-01", serviceId: "service-1", selectedOptionAlternativeIds: ["option-1"] }, now);
    expect(result.slots.length).toBeGreaterThan(0); expect(result.slots.every((slot) => slot.staffId === null)).toBe(true);
  });
  it.each(["?date=2026-02-30", "?date=2026-10-01&serviceId=service-1&staffId=any", "?date=2026-10-01&serviceId=foreign-service&staffId=staff-a", "?date=2026-10-01&serviceId=service-1&locationId=foreign-location&staffId=staff-a", "?date=2026-10-01&date=2026-10-02", "?date=2026-10-01&unexpected=1"])("rejects invalid/foreign selections %s", async (query) => {
    expect((await availability(request(query), context)).status).toBe(400);
  });
  it("encodes options as repeated query keys, never a comma-separated value", async () => {
    const query = "?date=2026-10-01&serviceId=service-1&staffId=staff-a&selectedOptionAlternativeIds=option-2";
    const response = await availability(request(query), context);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.selection).toMatchObject({ duration: 90, price: 25000, requiresAddress: true });
    expect(body.slots[0]).toEqual({ startTime: "2026-10-01T12:00:00.000Z", endTime: "2026-10-01T13:30:00.000Z", staffId: "staff-a" });
  });
  it("chooses first available by staff ID at each start, including another staff when busy", async () => {
    mocks.busy.mockImplementation(async (_b, _start, _end, staff) => staff === "staff-a" ? [{ startTime: new Date("2026-10-01T12:00:00Z"), endTime: new Date("2026-10-01T13:00:00Z") }] : []);
    const result = await getBookingAvailability(bookingFixture(), { date: "2026-10-01", serviceId: "service-1", firstAvailable: true, selectedOptionAlternativeIds: ["option-1"] }, now);
    expect(result.slots[0].staffId).toBe("staff-b");
    expect(result.slots.find((slot) => slot.startTime === "2026-10-01T13:00:00.000Z")?.staffId).toBe("staff-a");
  });
  it("returns empty on blocked days without disclosing private reason", async () => {
    mocks.blockedDate.mockResolvedValue({ id: "blocked", reason: "private" });
    const result = await getBookingAvailability(bookingFixture(), { date: "2026-10-01", serviceId: "service-1", staffId: "staff-a", selectedOptionAlternativeIds: ["option-1"] }, now);
    expect(result.slots).toEqual([]); expect(JSON.stringify(result)).not.toContain("private"); expect(mocks.busy).not.toHaveBeenCalled();
  });
  it("limits date horizon and enforces actual staff service/location assignments", async () => {
    const data = bookingFixture(); data.staff[0].locations = [];
    await expect(getBookingAvailability(data, { date: "2026-10-01", serviceId: "service-1", staffId: "staff-a", selectedOptionAlternativeIds: ["option-1"] }, now)).rejects.toThrow();
    await expect(getBookingAvailability(data, { date: "2027-10-01", serviceId: "service-1", firstAvailable: true, selectedOptionAlternativeIds: ["option-1"] }, now)).rejects.toMatchObject({ code: "DATE_OUT_OF_RANGE" });
  });
  it("returns stable 429 with retry header", async () => {
    mocks.limiter.mockReturnValue(Response.json({}, { status: 429, headers: { "Retry-After": "42" } }));
    const response = await catalog(request(), context);
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("42");
  });
});
