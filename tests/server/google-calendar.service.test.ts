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
  disconnectGoogleCalendarConnection,
  encryptGoogleToken,
  getGoogleCalendarBusySlots,
  googleCalendarAppUrl,
  listGoogleCalendars,
  removeAppointmentFromGoogle,
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

const internalNote = "SYNTHETIC_INTERNAL_NOTE_MUST_STAY_IN_PURAGENDA";

function eventMapping(connection = staffConnection) {
  return {
    id: "mapping-1",
    appointmentId: "appointment-1",
    connectionId: connection.id,
    calendarId: connection.calendarId,
    googleEventId: "google-event-1",
    connection,
  };
}

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
  it.each(["America/Santiago", "Pacific/Easter"].flatMap(timezone => [false, true].map(mapped => ({ timezone, mapped }))))("keeps the UTC instant for new and existing branch events: %j", async ({ timezone, mapped }) => {
    const row = { ...appointment(), customerAddress: null, startTime: new Date("2026-07-04T04:30:00Z"), endTime: new Date("2026-07-04T05:00:00Z"),
      locationId: "booked-branch", location: { timezone, address: "Booked branch 100", mapsUrl: null },
      googleCalendarEvent: mapped ? { id: "synthetic-mapping", connectionId: staffConnection.id, calendarId: staffConnection.calendarId, googleEventId: "synthetic-event", connection: staffConnection } : null };
    prismaMock.appointment.findUnique.mockResolvedValue(row);
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "synthetic-event" })); vi.stubGlobal("fetch", fetchMock);
    expect(await syncAppointmentToGoogle(row.id)).toMatchObject({ synced: true, action: mapped ? "updated" : "created" });
    expect(fetchMock.mock.calls[0][1].method).toBe(mapped ? "PUT" : "POST");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ location: "Booked branch 100", start: { dateTime: row.startTime.toISOString(), timeZone: timezone }, end: { dateTime: row.endTime.toISOString(), timeZone: timezone } });
    expect(row.startTime.toISOString()).toBe("2026-07-04T04:30:00.000Z");
  });

  it.each([false, true].flatMap(includeCustomerAttendee =>
    ["create", "confirm", "reschedule", "retry-create", "retry-update"].map(flow => ({ includeCustomerAttendee, flow })),
  ))("never exports internal notes during $flow with customer attendee=$includeCustomerAttendee", async ({ includeCustomerAttendee, flow }) => {
    const connection = { ...staffConnection, includeCustomerAttendee };
    const mapped = ["confirm", "reschedule", "retry-update"].includes(flow);
    const row = {
      ...appointment(flow === "create" ? "PENDING" : "CONFIRMED"),
      internalNotes: internalNote,
      customerAddress: null,
      locationId: "island-branch",
      location: { timezone: "Pacific/Easter", address: "Isla 100", mapsUrl: null },
      business: { ...appointment().business, googleCalendarConnections: [connection] },
      googleCalendarEvent: mapped ? eventMapping(connection) : null,
    };
    if (flow === "reschedule") {
      row.startTime = new Date("2026-08-11T14:00:00Z");
      row.endTime = new Date("2026-08-11T15:00:00Z");
    }
    prismaMock.appointment.findUnique.mockResolvedValue(row);
    const fetchMock = vi.fn().mockImplementation(async () => Response.json({ id: "google-event-1" }));
    if (flow === "retry-create" || flow === "retry-update") {
      fetchMock.mockResolvedValueOnce(Response.json({ error: { message: "synthetic retry" } }, { status: flow === "retry-create" ? 409 : 404 }));
    }
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncAppointmentToGoogle(row.id)).resolves.toMatchObject({ synced: true, action: mapped ? "updated" : "created" });

    expect(fetchMock.mock.calls.map(([, request]) => request.method)).toEqual(
      flow === "retry-create" ? ["POST", "PUT"] : flow === "retry-update" ? ["PUT", "POST"] : [mapped ? "PUT" : "POST"],
    );
    for (const [url, request] of fetchMock.mock.calls) {
      expect(url).toContain("sendUpdates=all");
      const body = JSON.parse(request.body);
      expect(body).toMatchObject({ location: "Isla 100", start: { dateTime: row.startTime.toISOString(), timeZone: "Pacific/Easter" }, end: { dateTime: row.endTime.toISOString(), timeZone: "Pacific/Easter" } });
      expect(body.attendees.some((attendee: { email: string }) => attendee.email === row.customerEmail)).toBe(includeCustomerAttendee);
      expect(body.attendees).toContainEqual({ email: "paz@negocio.cl" });
      expect(JSON.stringify([url, request])).not.toContain(internalNote);
      expect(request.body).not.toMatch(/internalNotes|Notas internas/);
    }
    const query = prismaMock.appointment.findUnique.mock.calls[0][0];
    expect(query.select).toBeDefined();
    expect(query.select).not.toHaveProperty("internalNotes");
    expect(row.internalNotes).toBe(internalNote);
    expect(prismaMock.googleCalendarEvent.upsert).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("redacts historical descriptions before cancellation, customer attendee=%s", async includeCustomerAttendee => {
    const mappedAppointment = appointment("CANCELLED");
    mappedAppointment.googleCalendarEvent = eventMapping({ ...staffConnection, includeCustomerAttendee }) as never;
    const row = { ...mappedAppointment, internalNotes: internalNote };
    let remoteDescription = `Notas internas: ${internalNote}`;
    prismaMock.appointment.findUnique.mockResolvedValue(row);
    const fetchMock = vi.fn().mockImplementation(async (_url: string, request: RequestInit) => {
      if (request.method === "PATCH") remoteDescription = JSON.parse(request.body as string).description;
      if (request.method === "DELETE") expect(remoteDescription).toBe("");
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncAppointmentToGoogle("appointment-1")).resolves.toMatchObject({ synced: true, action: "deleted" });
    expect(fetchMock.mock.calls.map(([url, request]) => [url, request.method])).toEqual([
      [expect.stringContaining("/calendars/worker-calendar/events/google-event-1?sendUpdates=none"), "PATCH"],
      [expect.stringContaining("/calendars/worker-calendar/events/google-event-1?sendUpdates=all"), "DELETE"],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ description: "" });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(internalNote);
    expect(row.internalNotes).toBe(internalNote);
    expect(prismaMock.googleCalendarEvent.delete).toHaveBeenCalledWith({ where: { id: "mapping-1" } });
  });

  it("retains the mapping and sends no cancellation if historical redaction fails, then retries safely", async () => {
    const mappedAppointment = { ...appointment("CANCELLED"), internalNotes: internalNote, googleCalendarEvent: eventMapping() };
    prismaMock.appointment.findUnique.mockResolvedValue(mappedAppointment);
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ error: { message: "synthetic failure" } }, { status: 503 }))
      .mockImplementation(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncAppointmentToGoogle("appointment-1")).resolves.toMatchObject({ synced: false, reason: "delete_failed" });
    expect(fetchMock.mock.calls.map(([, request]) => request.method)).toEqual(["PATCH"]);
    expect(prismaMock.googleCalendarEvent.delete).not.toHaveBeenCalled();
    await expect(syncAppointmentToGoogle("appointment-1")).resolves.toMatchObject({ synced: true, action: "deleted" });
    expect(fetchMock.mock.calls.map(([, request]) => request.method)).toEqual(["PATCH", "PATCH", "DELETE"]);
    expect(prismaMock.googleCalendarEvent.delete).toHaveBeenCalledTimes(1);
  });

  it.each(["PATCH", "DELETE"])("keeps deletion idempotent when %s finds the remote event absent", async missingAt => {
    prismaMock.appointment.findUnique.mockResolvedValue({ ...appointment("CANCELLED"), googleCalendarEvent: eventMapping() });
    const fetchMock = vi.fn().mockImplementation(async (_url: string, request: RequestInit) => request.method === missingAt
      ? Response.json({ error: { message: "not found" } }, { status: 404 })
      : new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(syncAppointmentToGoogle("appointment-1")).resolves.toMatchObject({ synced: true, action: "deleted" });
    expect(fetchMock).toHaveBeenCalledTimes(missingAt === "PATCH" ? 1 : 2);
    expect(prismaMock.googleCalendarEvent.delete).toHaveBeenCalledWith({ where: { id: "mapping-1" } });
  });

  it("redacts the old event before moving an appointment to another calendar", async () => {
    const row = { ...appointment(), internalNotes: internalNote, googleCalendarEvent: eventMapping({ ...staffConnection, id: "old-connection", calendarId: "old-calendar" }) };
    prismaMock.appointment.findUnique.mockResolvedValue(row);
    const fetchMock = vi.fn().mockImplementation(async (_url: string, request: RequestInit) => request.method === "POST" ? Response.json({ id: "new-event" }) : new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(syncAppointmentToGoogle(row.id)).resolves.toMatchObject({ synced: true, action: "created" });
    expect(fetchMock.mock.calls.map(([, request]) => request.method)).toEqual(["PATCH", "DELETE", "POST"]);
    expect(fetchMock.mock.calls[0][0]).toContain("/calendars/old-calendar/events/google-event-1?sendUpdates=none");
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(internalNote);
  });

  it("redacts historical descriptions for direct appointment removal too", async () => {
    prismaMock.googleCalendarEvent.findUnique.mockResolvedValue(eventMapping());
    const fetchMock = vi.fn().mockImplementation(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await removeAppointmentFromGoogle("appointment-1");
    expect(fetchMock.mock.calls.map(([, request]) => request.method)).toEqual(["PATCH", "DELETE"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ description: "" });
  });

  it("redacts mapped events before disconnecting a calendar", async () => {
    prismaMock.googleCalendarConnection.findUnique.mockResolvedValue({ ...staffConnection, events: [eventMapping()] });
    const fetchMock = vi.fn().mockImplementation(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await disconnectGoogleCalendarConnection(staffConnection.id);

    expect(fetchMock.mock.calls.map(([, request]) => request.method)).toEqual(["PATCH", "DELETE", "POST"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ description: "" });
    expect(fetchMock.mock.calls[2][0]).toBe("https://oauth2.googleapis.com/revoke");
    expect(prismaMock.googleCalendarConnection.delete).toHaveBeenCalledWith({ where: { id: staffConnection.id } });
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
