import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildBookingSlots } from "@/core/booking-availability";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    googleCalendarConnection: { findFirst: mocks.findFirst, update: mocks.update },
    googleCalendarReadSelection: { findMany: mocks.findMany },
  },
}));

import { encryptGoogleToken, getGoogleCalendarBusySlots } from "@/server/services/google-calendar.service";

describe("Google Calendar multiple availability calendars", () => {
  const connection = {
    id: "connection-1",
    businessId: "business-1",
    staffId: "staff-1",
    userId: "user-1",
    scope: "STAFF",
    scopeKey: "staff:staff-1",
    googleEmail: "owner@example.com",
    calendarId: "therapy",
    calendarName: "PsicoCalendario",
    accessTokenEncrypted: "",
    refreshTokenEncrypted: null,
    tokenExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
    syncEnabled: true,
    includeCustomerAttendee: true,
    lastSyncedAt: null,
    lastSyncError: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "test-google-token-key-with-at-least-32-characters";
    connection.accessTokenEncrypted = encryptGoogleToken("access-token");
    mocks.findFirst.mockResolvedValue(connection);
    mocks.findMany.mockResolvedValue([
      { calendarId: "personal", calendarName: "Personal" },
      { calendarId: "therapy", calendarName: "PsicoCalendario" },
      { calendarId: "meetings", calendarName: "Reuniones" },
    ]);
    mocks.update.mockResolvedValue({});
  });

  afterEach(() => vi.unstubAllGlobals());

  it("queries every selected calendar and merges overlapping intervals", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      calendars: {
        personal: { busy: [{ start: "2026-10-20T09:00:00Z", end: "2026-10-20T10:00:00Z" }] },
        therapy: { busy: [{ start: "2026-10-20T09:30:00Z", end: "2026-10-20T11:15:00Z" }] },
        meetings: { busy: [{ start: "2026-10-20T12:00:00Z", end: "2026-10-20T13:00:00Z" }] },
      },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getGoogleCalendarBusySlots(
      "staff-1",
      new Date("2026-10-20T00:00:00Z"),
      new Date("2026-10-21T00:00:00Z"),
    )).resolves.toEqual([
      { startTime: new Date("2026-10-20T09:00:00Z"), endTime: new Date("2026-10-20T11:15:00Z") },
      { startTime: new Date("2026-10-20T12:00:00Z"), endTime: new Date("2026-10-20T13:00:00Z") },
    ]);

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string).items).toEqual([
      { id: "personal" }, { id: "therapy" }, { id: "meetings" },
    ]);
  });

  const start = new Date("2026-10-27T03:00:00Z");
  const end = new Date("2026-10-28T03:00:00Z");
  const insufficientScope = () => Response.json({ error: {
    message: "Request had insufficient authentication scopes.",
  } }, { status: 403 });
  const event = (startTime: string, endTime: string) => ({
    start: { dateTime: startTime }, end: { dateTime: endTime },
  });
  const busy = () => getGoogleCalendarBusySlots("staff-1", start, end, "business-1");

  it("recovers business calendars with legacy scopes and keeps real events blocked", async () => {
    mocks.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...connection, scope: "BUSINESS", staffId: null });
    mocks.findMany.mockResolvedValue([]); // Existing grants predate read selections.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(insufficientScope())
      .mockResolvedValueOnce(Response.json({ timeZone: "America/Santiago", items: [
        event("2026-10-27T15:00:00Z", "2026-10-27T16:00:00Z"),
      ] }));
    vi.stubGlobal("fetch", fetchMock);

    const blocked = await busy();
    expect(blocked).toEqual([{ startTime: new Date("2026-10-27T15:00:00Z"), endTime: new Date("2026-10-27T16:00:00Z") }]);
    const slots = buildBookingSlots({
      date: new Date(2026, 9, 27, 12), duration: 60, timezone: "America/Santiago",
      businessHours: [{ dayOfWeek: 2, startTime: "10:00", endTime: "20:00", isOpen: true }],
      slotInterval: 120, allowSameDayBookings: false, minAdvanceBookingMinutes: 120,
      services: [], blocked, now: new Date("2026-10-26T12:00:00Z"),
    });
    expect(slots.map((slot) => slot.start.getHours())).toEqual([10, 14, 16, 18]);
    expect(mocks.update).not.toHaveBeenCalled();
    const url = new URL(fetchMock.mock.calls[1][0]);
    expect(url.pathname).toBe("/calendar/v3/calendars/therapy/events");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("timeMin")).toBe(start.toISOString());
    expect(url.searchParams.get("timeMax")).toBe(end.toISOString());
    expect(url.searchParams.get("fields")).not.toMatch(/summary|description|email/);
  });

  it("returns no fabricated block when the legacy calendar is empty", async () => {
    mocks.findMany.mockResolvedValue([{ calendarId: "therapy" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(insufficientScope())
      .mockResolvedValueOnce(Response.json({ timeZone: "America/Santiago", items: [] })));
    await expect(busy()).resolves.toEqual([]);
  });

  it("reads all selected calendars and every recurring event page before merging", async () => {
    mocks.findMany.mockResolvedValue([{ calendarId: "therapy@example.com" }, { calendarId: "personal" }]);
    const fetchMock = vi.fn().mockResolvedValueOnce(insufficientScope())
      .mockResolvedValueOnce(Response.json({ items: [event("2026-10-27T15:00:00Z", "2026-10-27T16:00:00Z")], nextPageToken: "page-2" }))
      .mockResolvedValueOnce(Response.json({ items: [event("2026-10-27T17:00:00Z", "2026-10-27T18:00:00Z")] }))
      .mockResolvedValueOnce(Response.json({ items: [event("2026-10-27T15:30:00Z", "2026-10-27T17:30:00Z")] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(busy()).resolves.toEqual([{ startTime: new Date("2026-10-27T15:00:00Z"), endTime: new Date("2026-10-27T18:00:00Z") }]);
    expect(fetchMock.mock.calls[1][0]).toContain("therapy%40example.com/events?");
    expect(new URL(fetchMock.mock.calls[2][0]).searchParams.get("pageToken")).toBe("page-2");
    expect(fetchMock.mock.calls[3][0]).toContain("/personal/events?");
  });

  it("ignores transparent, cancelled and declined events", async () => {
    mocks.findMany.mockResolvedValue([{ calendarId: "therapy" }]);
    const range = event("2026-10-27T15:00:00Z", "2026-10-27T16:00:00Z");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(insufficientScope())
      .mockResolvedValueOnce(Response.json({ items: [
        { ...range, transparency: "transparent" }, { ...range, status: "cancelled" },
        { ...range, attendees: [{ self: true, responseStatus: "declined" }] },
      ] })));
    await expect(busy()).resolves.toEqual([]);
  });

  it("converts all-day events using the calendar timezone across DST", async () => {
    mocks.findMany.mockResolvedValue([{ calendarId: "therapy" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(insufficientScope())
      .mockResolvedValueOnce(Response.json({ timeZone: "America/New_York", items: [
        { start: { date: "2026-11-01" }, end: { date: "2026-11-02" } },
      ] })));
    await expect(busy()).resolves.toEqual([{ startTime: new Date("2026-11-01T04:00:00Z"), endTime: new Date("2026-11-02T05:00:00Z") }]);
  });

  it.each([401, 429, 500])("preserves protection on provider failure %s", async (status) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ error: { message: "Provider unavailable" } }, { status }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(busy()).resolves.toEqual([{ startTime: start, endTime: end }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: { lastSyncError: "Provider unavailable" } }));
  });

  it("keeps the day protected if any selected calendar cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(insufficientScope())
      .mockResolvedValueOnce(Response.json({ items: [] }))
      .mockResolvedValueOnce(Response.json({ error: { message: "Forbidden" } }, { status: 403 })));
    await expect(busy()).resolves.toEqual([{ startTime: start, endTime: end }]);
  });

  it.each([
    {}, { items: [{ start: { dateTime: "invalid" }, end: { dateTime: "invalid" } }] },
    { items: [{ start: { date: "2026-10-27" }, end: { date: "2026-10-28" } }] },
  ])("does not treat malformed fallback data as a free calendar: %j", async (data) => {
    mocks.findMany.mockResolvedValue([{ calendarId: "therapy" }]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(insufficientScope()).mockResolvedValueOnce(Response.json(data)));
    await expect(busy()).resolves.toEqual([{ startTime: start, endTime: end }]);
  });
});

