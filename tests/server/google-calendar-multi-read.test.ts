import { beforeEach, describe, expect, it, vi } from "vitest";

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
});

