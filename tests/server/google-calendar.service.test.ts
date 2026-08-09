import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  appointment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  googleCalendarConnection: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  googleCalendarEvent: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }));

import {
  buildGoogleAuthorizationUrl,
  createGoogleOAuthState,
  decryptGoogleToken,
  encryptGoogleToken,
  getGoogleCalendarBusySlots,
  googleCalendarAppUrl,
  googleCalendarOAuthIsAvailableFor,
  listGoogleCalendars,
  syncAppointmentToGoogle,
  verifyGoogleOAuthState,
} from "@/server/services/google-calendar.service";

const staffConnection = {
  id: "google-staff",
  businessId: "business-1",
  staffId: "staff-1",
  userId: "user-2",
  scope: "STAFF",
  scopeKey: "staff:staff-1",
  googleEmail: "worker@gmail.com",
  calendarId: "worker-calendar",
  calendarName: "Trabajo",
  accessTokenEncrypted: "",
  refreshTokenEncrypted: null,
  tokenExpiresAt: new Date("2099-01-01T00:00:00Z"),
  syncEnabled: true,
  includeCustomerAttendee: true,
  lastSyncedAt: null,
  lastSyncError: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function appointment(status = "CONFIRMED") {
  return {
    id: "appointment-1",
    businessId: "business-1",
    staffId: "staff-1",
    customerName: "Ana Cliente",
    customerEmail: "ana@example.com",
    customerPhone: "+56 9 1234 5678",
    customerAddress: "Calle Uno 123",
    internalNotes: null,
    startTime: new Date("2026-08-10T14:00:00Z"),
    endTime: new Date("2026-08-10T15:00:00Z"),
    status,
    service: { name: "Masaje" },
    staff: {
      id: "staff-1",
      name: "Paz Profesional",
      email: "paz@negocio.cl",
      user: { email: "worker@gmail.com" },
    },
    business: {
      id: "business-1",
      name: "Terapias",
      address: "Local 4",
      timezone: "America/Santiago",
      owner: { email: "owner@example.com" },
      googleCalendarConnections: [
        { ...staffConnection, accessTokenEncrypted: encryptGoogleToken("staff-access") },
        {
          ...staffConnection,
          id: "google-business",
          staffId: null,
          userId: "owner-1",
          scope: "BUSINESS",
          scopeKey: "business",
          googleEmail: "owner@gmail.com",
          calendarId: "business-calendar",
          accessTokenEncrypted: encryptGoogleToken("business-access"),
        },
      ],
    },
    googleCalendarEvent: null,
  };
}

describe("Google Calendar integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "test-google-token-key-with-at-least-32-characters";
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    process.env.GOOGLE_CALENDAR_REDIRECT_URI = "https://app.example.com/api/google-calendar/callback";
    delete process.env.NEXT_PUBLIC_APP_URL;
    staffConnection.accessTokenEncrypted = encryptGoogleToken("staff-access");
    prismaMock.googleCalendarConnection.update.mockResolvedValue({});
    prismaMock.googleCalendarEvent.upsert.mockResolvedValue({});
    prismaMock.googleCalendarEvent.delete.mockResolvedValue({});
    prismaMock.googleCalendarEvent.update.mockResolvedValue({});
  });

  it("encrypts tokens with authenticated encryption and rejects tampering", () => {
    const encrypted = encryptGoogleToken("refresh-secret");
    expect(encrypted).not.toContain("refresh-secret");
    expect(decryptGoogleToken(encrypted)).toBe("refresh-secret");
    const [version, iv, tag, ciphertext] = encrypted.split(".");
    const tamperedTag = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
    expect(() => decryptGoogleToken([version, iv, tamperedTag, ciphertext].join("."))).toThrow();
  });

  it("signs expiring OAuth state and rejects a modified state", () => {
    const state = createGoogleOAuthState({
      userId: "owner-1",
      businessId: "business-1",
      scope: "BUSINESS",
      scopeKey: "business",
      staffId: null,
    });
    expect(verifyGoogleOAuthState(state)).toMatchObject({
      userId: "owner-1",
      businessId: "business-1",
      scope: "BUSINESS",
    });
    expect(verifyGoogleOAuthState(`${state.slice(0, -1)}x`)).toBeNull();
  });

  it("requests offline access with the calendar scopes", () => {
    const url = new URL(buildGoogleAuthorizationUrl("signed-state", "owner@example.com"));
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/google-calendar/callback",
    );
    expect(url.searchParams.get("scope")).toContain("calendar.events");
    expect(url.searchParams.get("scope")).toContain("calendar.events.freebusy");
    expect(url.searchParams.get("scope")).toContain("calendar.calendarlist.readonly");
  });

  it("limits production OAuth to allowlisted reviewers until the scope is verified", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.GOOGLE_CALENDAR_OAUTH_PUBLIC = "false";
    process.env.GOOGLE_CALENDAR_VERIFICATION_USERS = "reviewer@example.com, Owner@Example.com";

    expect(googleCalendarOAuthIsAvailableFor("owner@example.com")).toBe(true);
    expect(googleCalendarOAuthIsAvailableFor("customer@example.com")).toBe(false);

    process.env.GOOGLE_CALENDAR_OAUTH_PUBLIC = "true";
    expect(googleCalendarOAuthIsAvailableFor("customer@example.com")).toBe(true);
  });

  it("labels writable shared calendars for the destination selector", async () => {
    const connection = {
      ...staffConnection,
      accessTokenEncrypted: encryptGoogleToken("staff-access"),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            items: [
              {
                id: "worker@gmail.com",
                summary: "Principal",
                primary: true,
                accessRole: "owner",
              },
              {
                id: "shared@example.com",
                summary: "Agenda del negocio",
                dataOwner: "business-owner@example.com",
                accessRole: "writer",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(listGoogleCalendars(connection)).resolves.toEqual([
      {
        id: "worker@gmail.com",
        name: "Principal",
        primary: true,
        accessRole: "owner",
        shared: false,
      },
      {
        id: "shared@example.com",
        name: "Agenda del negocio",
        primary: false,
        accessRole: "writer",
        shared: true,
      },
    ]);
  });

  it("never redirects the Google Calendar flow to a Vercel deployment domain", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://puragenda.vercel.app";

    expect(
      googleCalendarAppUrl(
        "/dashboard/google-calendar?google_connected=true",
        "https://puragenda.vercel.app/api/google-calendar/callback",
      ).toString(),
    ).toBe(
      "https://www.puragenda.cl/dashboard/google-calendar?google_connected=true",
    );
  });

  it("keeps localhost available for local OAuth testing", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

    expect(
      googleCalendarAppUrl("/dashboard/google-calendar", "http://localhost:3000/callback").toString(),
    ).toBe("http://localhost:3000/dashboard/google-calendar");
  });

  it("uses the assigned worker calendar, includes contact data, and invites both parties", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue(appointment());
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ id: "google-event-1", htmlLink: "https://calendar.google/event" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncAppointmentToGoogle("appointment-1")).resolves.toMatchObject({
      synced: true,
      action: "created",
    });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/calendars/worker-calendar/events?sendUpdates=all");
    expect(request.headers).toMatchObject({ Authorization: "Bearer staff-access" });
    const body = JSON.parse(request.body as string);
    expect(body.description).toContain("+56 9 1234 5678");
    expect(body.attendees).toEqual(
      expect.arrayContaining([{ email: "ana@example.com" }, { email: "paz@negocio.cl" }]),
    );
    expect(body.attendees).not.toContainEqual({ email: "worker@gmail.com" });
    expect(prismaMock.googleCalendarEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { appointmentId: "appointment-1" } }),
    );
  });

  it("deletes the mapped Google event when an appointment is cancelled", async () => {
    const mappedAppointment = appointment("CANCELLED");
    mappedAppointment.googleCalendarEvent = {
      id: "mapping-1",
      appointmentId: "appointment-1",
      connectionId: "google-staff",
      calendarId: "worker-calendar",
      googleEventId: "google-event-1",
      googleEventUrl: null,
      etag: null,
      lastSyncedAt: new Date(),
      syncError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      connection: staffConnection,
    } as never;
    prismaMock.appointment.findUnique.mockResolvedValue(mappedAppointment);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncAppointmentToGoogle("appointment-1")).resolves.toMatchObject({
      synced: true,
      action: "deleted",
    });
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/calendars/worker-calendar/events/google-event-1?sendUpdates=all",
    );
    expect(prismaMock.googleCalendarEvent.delete).toHaveBeenCalledWith({
      where: { id: "mapping-1" },
    });
  });

  it("reads external busy periods from the worker calendar", async () => {
    prismaMock.googleCalendarConnection.findFirst.mockResolvedValue(staffConnection);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            calendars: {
              "worker-calendar": {
                busy: [{ start: "2026-08-10T12:00:00Z", end: "2026-08-10T13:00:00Z" }],
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const slots = await getGoogleCalendarBusySlots(
      "staff-1",
      new Date("2026-08-10T00:00:00Z"),
      new Date("2026-08-11T00:00:00Z"),
    );
    expect(slots).toEqual([
      {
        startTime: new Date("2026-08-10T12:00:00Z"),
        endTime: new Date("2026-08-10T13:00:00Z"),
      },
    ]);
  });
});
