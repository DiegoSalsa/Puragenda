import { resolveAppointmentVenue, appointmentVenueSelect } from "@/server/services/appointment-venue";
import crypto from "node:crypto";
import type { GoogleCalendarConnection } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

import { SITE_URL } from "@/lib/site";
import { prisma } from "@/server/db/prisma";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_API_URL = "https://www.googleapis.com";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.events.freebusy",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function isVercelDeploymentHost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "vercel.app" || normalized.endsWith(".vercel.app");
}

export function googleCalendarAppUrl(path: string, requestUrl?: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = configuredUrl || requestUrl || SITE_URL;

  try {
    const parsedBase = new URL(baseUrl);
    if (isVercelDeploymentHost(parsedBase.hostname)) {
      return new URL(path, `${SITE_URL}/`);
    }
    return new URL(path, parsedBase);
  } catch {
    return new URL(path, `${SITE_URL}/`);
  }
}

type GoogleConnectionScope = "BUSINESS" | "STAFF";

export type GoogleOAuthState = {
  userId: string;
  businessId: string;
  scope: GoogleConnectionScope;
  scopeKey: string;
  staffId: string | null;
  nonce: string;
  expiresAt: number;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  primary?: boolean;
  dataOwner?: string;
  accessRole?: "freeBusyReader" | "reader" | "writer" | "owner";
};

export type GoogleCalendarAvailabilityOption = {
  id: string;
  name: string;
  primary: boolean;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
  shared: boolean;
  canWrite: boolean;
};

type GoogleEventResponse = {
  id?: string;
  htmlLink?: string;
  etag?: string;
};

class GoogleCalendarApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleCalendarApiError";
  }
}

function base64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function googleServerSecret() {
  const secret =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ??
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY or AUTH_SECRET must contain at least 32 characters",
    );
  }
  return "dev-only-google-calendar-secret-not-for-production";
}

function encryptionKey() {
  return crypto.createHash("sha256").update(googleServerSecret()).digest();
}

export function encryptGoogleToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${base64Url(iv)}.${base64Url(tag)}.${base64Url(encrypted)}`;
}

export function decryptGoogleToken(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted Google token");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function oauthStateSignature(payload: string) {
  return base64Url(
    crypto.createHmac("sha256", googleServerSecret()).update(payload).digest(),
  );
}

export function createGoogleOAuthState(
  input: Omit<GoogleOAuthState, "nonce" | "expiresAt">,
) {
  const state: GoogleOAuthState = {
    ...input,
    nonce: crypto.randomBytes(18).toString("hex"),
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  };
  const payload = base64Url(JSON.stringify(state));
  return `${payload}.${oauthStateSignature(payload)}`;
}

export function verifyGoogleOAuthState(value: string): GoogleOAuthState | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = oauthStateSignature(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const state = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as GoogleOAuthState;
    if (
      state.expiresAt <= Date.now() ||
      !state.userId ||
      !state.businessId ||
      !state.scopeKey ||
      !["BUSINESS", "STAFF"].includes(state.scope)
    ) {
      return null;
    }
    if (state.scope === "STAFF" && !state.staffId) return null;
    if (state.scope === "BUSINESS" && state.staffId) return null;
    return state;
  } catch {
    return null;
  }
}

export function googleCalendarIsConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      googleCalendarRedirectUri(),
  );
}

export function googleCalendarRedirectUri() {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/google-calendar/callback`
      : "")
  );
}

function requireGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = googleCalendarRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Calendar OAuth is not configured");
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildGoogleAuthorizationUrl(state: string, loginHint?: string) {
  const { clientId, redirectUri } = requireGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    scope: GOOGLE_SCOPES.join(" "),
    state,
  });
  if (loginHint) params.set("login_hint", loginHint);
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function parseGoogleError(response: Response) {
  const body = (await response.json().catch(() => null)) as
    | { error?: { message?: string } | string; error_description?: string }
    | null;
  if (typeof body?.error === "string") {
    return body.error_description || body.error;
  }
  return body?.error?.message || `Google API returned ${response.status}`;
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const { clientId, clientSecret, redirectUri } = requireGoogleOAuthConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !tokens.access_token) {
    throw new Error(tokens.error_description || tokens.error || "Google token exchange failed");
  }
  return { ...tokens, access_token: tokens.access_token };
}

export async function getGoogleAccountEmail(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(await parseGoogleError(response));
  const profile = (await response.json()) as { email?: string };
  if (!profile.email) throw new Error("Google account email was not returned");
  return profile.email;
}

async function refreshGoogleAccessToken(connection: GoogleCalendarConnection) {
  if (!connection.refreshTokenEncrypted) {
    throw new Error("Google authorization expired; reconnect the account");
  }
  const { clientId, clientSecret } = requireGoogleOAuthConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptGoogleToken(connection.refreshTokenEncrypted),
      grant_type: "refresh_token",
    }),
  });
  const tokens = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !tokens.access_token) {
    throw new Error(tokens.error_description || tokens.error || "Google token refresh failed");
  }
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEncrypted: encryptGoogleToken(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token
        ? encryptGoogleToken(tokens.refresh_token)
        : connection.refreshTokenEncrypted,
      tokenExpiresAt: expiresAt,
      lastSyncError: null,
    },
  });
  return tokens.access_token;
}

async function connectionAccessToken(
  connection: GoogleCalendarConnection,
  forceRefresh = false,
) {
  const stillValid =
    connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 60_000;
  if (!forceRefresh && stillValid) {
    return decryptGoogleToken(connection.accessTokenEncrypted);
  }
  return refreshGoogleAccessToken(connection);
}

async function googleApiRequest(
  connection: GoogleCalendarConnection,
  path: string,
  init: RequestInit = {},
) {
  let accessToken = await connectionAccessToken(connection);
  const execute = () =>
    fetch(`${GOOGLE_API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let response = await execute();
  if (response.status === 401 && connection.refreshTokenEncrypted) {
    accessToken = await connectionAccessToken(connection, true);
    response = await execute();
  }
  if (!response.ok) {
    throw new GoogleCalendarApiError(response.status, await parseGoogleError(response));
  }
  return response;
}

export async function listGoogleCalendars(connection: GoogleCalendarConnection) {
  const response = await googleApiRequest(
    connection,
    "/calendar/v3/users/me/calendarList?minAccessRole=writer&maxResults=250",
  );
  const data = (await response.json()) as { items?: GoogleCalendarListEntry[] };
  return (data.items ?? [])
    .filter((calendar) => calendar.id && ["writer", "owner"].includes(calendar.accessRole ?? ""))
    .map((calendar) => ({
      id: calendar.id as string,
      name: calendar.summary || calendar.id || "Calendario",
      primary: Boolean(calendar.primary),
      accessRole: calendar.accessRole as "writer" | "owner",
      shared:
        calendar.accessRole === "writer" ||
        Boolean(
          calendar.dataOwner &&
            calendar.dataOwner.trim().toLowerCase() !== connection.googleEmail.trim().toLowerCase(),
        ),
    }));
}

/** Lists calendars that can be queried with FreeBusy, including read-only shares. */
export async function listGoogleCalendarsForAvailability(connection: GoogleCalendarConnection): Promise<GoogleCalendarAvailabilityOption[]> {
  const response = await googleApiRequest(
    connection,
    "/calendar/v3/users/me/calendarList?minAccessRole=freeBusyReader&maxResults=250",
  );
  const data = (await response.json()) as { items?: GoogleCalendarListEntry[] };
  return (data.items ?? [])
    .filter((calendar) => calendar.id && ["freeBusyReader", "reader", "writer", "owner"].includes(calendar.accessRole ?? ""))
    .map((calendar) => {
      const accessRole = calendar.accessRole as GoogleCalendarAvailabilityOption["accessRole"];
      return {
        id: calendar.id as string,
        name: calendar.summary || calendar.id || "Calendario",
        primary: Boolean(calendar.primary),
        accessRole,
        shared: Boolean(
          calendar.dataOwner &&
            calendar.dataOwner.trim().toLowerCase() !== connection.googleEmail.trim().toLowerCase(),
        ),
        canWrite: accessRole === "writer" || accessRole === "owner",
      };
    });
}

async function readCalendarSelections(connection: GoogleCalendarConnection) {
  const model = (prisma as typeof prisma & {
    googleCalendarReadSelection?: {
      findMany: (args: unknown) => Promise<Array<{ calendarId: string; calendarName: string | null }>>;
    };
  }).googleCalendarReadSelection;
  const rows = model
    ? await model.findMany({ where: { connectionId: connection.id }, orderBy: { calendarId: "asc" }, select: { calendarId: true, calendarName: true } })
    : [];
  return rows.length > 0 ? rows : [{ calendarId: connection.calendarId, calendarName: connection.calendarName }];
}

export async function getGoogleCalendarReadSelections(connectionId: string) {
  return prisma.googleCalendarReadSelection.findMany({
    where: { connectionId },
    orderBy: { calendarId: "asc" },
    select: { calendarId: true, calendarName: true },
  });
}

export async function setGoogleCalendarReadSelections(
  connection: GoogleCalendarConnection,
  calendars: Array<{ id: string; name: string }>,
) {
  await prisma.$transaction(async (tx) => {
    await tx.googleCalendarReadSelection.deleteMany({ where: { connectionId: connection.id } });
    if (calendars.length > 0) {
      await tx.googleCalendarReadSelection.createMany({
        data: calendars.map((calendar) => ({ connectionId: connection.id, calendarId: calendar.id, calendarName: calendar.name })),
        skipDuplicates: true,
      });
    }
  });
}

export async function saveGoogleCalendarConnection(input: {
  state: GoogleOAuthState;
  tokens: GoogleTokenResponse & { access_token: string };
  googleEmail: string;
}) {
  if (input.state.scope === "STAFF" && !await prisma.staff.findFirst({ where: { id: input.state.staffId ?? "", businessId: input.state.businessId, userId: input.state.userId, isActive: true }, select: { id: true } })) throw new Error("El profesional está inactivo");
  const existing = await prisma.googleCalendarConnection.findUnique({
    where: {
      businessId_scopeKey: {
        businessId: input.state.businessId,
        scopeKey: input.state.scopeKey,
      },
    },
  });
  const refreshTokenEncrypted = input.tokens.refresh_token
    ? encryptGoogleToken(input.tokens.refresh_token)
    : existing?.refreshTokenEncrypted;
  if (!refreshTokenEncrypted) {
    throw new Error("Google did not return offline access; reconnect and grant permission");
  }

  const temporaryConnection = {
    ...(existing ?? {}),
    id: existing?.id ?? "oauth-preview",
    businessId: input.state.businessId,
    staffId: input.state.staffId,
    userId: input.state.userId,
    scope: input.state.scope,
    scopeKey: input.state.scopeKey,
    googleEmail: input.googleEmail,
    calendarId: existing?.calendarId ?? "primary",
    calendarName: existing?.calendarName ?? null,
    accessTokenEncrypted: encryptGoogleToken(input.tokens.access_token),
    refreshTokenEncrypted,
    tokenExpiresAt: new Date(Date.now() + (input.tokens.expires_in ?? 3600) * 1000),
    syncEnabled: true,
    includeCustomerAttendee: existing?.includeCustomerAttendee ?? true,
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    lastSyncError: null,
    createdAt: existing?.createdAt ?? new Date(),
    updatedAt: new Date(),
  } satisfies GoogleCalendarConnection;
  const calendars = await listGoogleCalendars(temporaryConnection);
  const selected =
    calendars.find((calendar) => calendar.id === existing?.calendarId) ??
    calendars.find((calendar) => calendar.primary) ??
    calendars[0];
  if (!selected) throw new Error("No writable Google calendar was found");

  const connection = await prisma.googleCalendarConnection.upsert({
    where: {
      businessId_scopeKey: {
        businessId: input.state.businessId,
        scopeKey: input.state.scopeKey,
      },
    },
    create: {
      businessId: input.state.businessId,
      staffId: input.state.staffId,
      userId: input.state.userId,
      scope: input.state.scope,
      scopeKey: input.state.scopeKey,
      googleEmail: input.googleEmail,
      calendarId: selected.id,
      calendarName: selected.name,
      accessTokenEncrypted: temporaryConnection.accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt: temporaryConnection.tokenExpiresAt,
    },
    update: {
      userId: input.state.userId,
      googleEmail: input.googleEmail,
      calendarId: selected.id,
      calendarName: selected.name,
      accessTokenEncrypted: temporaryConnection.accessTokenEncrypted,
      refreshTokenEncrypted,
      tokenExpiresAt: temporaryConnection.tokenExpiresAt,
      syncEnabled: true,
      lastSyncError: null,
    },
  });
  const readModel = prisma.googleCalendarReadSelection;
  await readModel.upsert({
    where: { connectionId_calendarId: { connectionId: connection.id, calendarId: selected.id } },
    create: { connectionId: connection.id, calendarId: selected.id, calendarName: selected.name },
    update: { calendarName: selected.name },
  });
  return connection;
}

function googleEventId(appointmentId: string) {
  return `puragenda${crypto.createHash("sha256").update(appointmentId).digest("hex")}`;
}

function uniqueAttendees(values: Array<string | null | undefined>, organizer: string) {
  const organizerEmail = organizer.trim().toLowerCase();
  return [...new Set(values.map((value) => value?.trim().toLowerCase()).filter(Boolean))]
    .filter((email) => email !== organizerEmail)
    .map((email) => ({ email: email as string }));
}

async function appointmentForGoogle(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    // Keep appointment fields explicit. Internal notes never belong in Google,
    // even when customer invitations are disabled.
    select: {
      id: true,
      businessId: true,
      locationId: true,
      staffId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customerAddress: true,
      startTime: true,
      endTime: true,
      status: true,
      location: { select: appointmentVenueSelect },
      service: { select: { name: true } },
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          user: { select: { email: true } },
        },
      },
      business: {
        select: {
          id: true,
          name: true,
          address: true,
          timezone: true,
          owner: { select: { email: true } },
          googleCalendarConnections: {
            where: { syncEnabled: true, OR: [{ scope: "BUSINESS" }, { staff: { isActive: true } }] },
            orderBy: [{ scope: "desc" }, { updatedAt: "desc" }],
          },
        },
      },
      googleCalendarEvent: {
        include: { connection: true },
      },
    },
  });
}

type GoogleAppointment = NonNullable<Awaited<ReturnType<typeof appointmentForGoogle>>>;

function selectAppointmentConnection(appointment: GoogleAppointment) {
  return (
    appointment.business.googleCalendarConnections.find(
      (connection) => connection.scope === "STAFF" && connection.staffId === appointment.staffId,
    ) ??
    appointment.business.googleCalendarConnections.find(
      (connection) => connection.scope === "BUSINESS",
    ) ??
    null
  );
}

async function buildGoogleEvent(appointment: GoogleAppointment, connection: GoogleCalendarConnection) {
  const venue = await resolveAppointmentVenue(appointment);
  const staffName = appointment.staff?.name ?? "Sin profesional asignado";
  const attendees = uniqueAttendees(
    [
      connection.includeCustomerAttendee ? appointment.customerEmail : null,
      appointment.staff?.email,
      appointment.staff?.user?.email,
    ],
    connection.googleEmail,
  );
  const description = [
    `Reserva de ${appointment.business.name}`,
    `Cliente: ${appointment.customerName}`,
    appointment.customerPhone ? `Teléfono: ${appointment.customerPhone}` : null,
    `Correo: ${appointment.customerEmail}`,
    `Servicio: ${appointment.service.name}`,
    `Profesional: ${staffName}`,
    `Estado: ${appointment.status}`,
    `ID Puragenda: ${appointment.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: googleEventId(appointment.id),
    summary: `${appointment.service.name} · ${appointment.customerName}`,
    description,
    location: appointment.customerAddress || venue.businessAddress || undefined,
    start: {
      dateTime: appointment.startTime.toISOString(),
      timeZone: venue.timezone,
    },
    end: {
      dateTime: appointment.endTime.toISOString(),
      timeZone: venue.timezone,
    },
    attendees,
    extendedProperties: {
      private: {
        puragendaAppointmentId: appointment.id,
        puragendaBusinessId: appointment.businessId,
      },
    },
  };
}

async function deleteMappedGoogleEvent(
  mapping: NonNullable<GoogleAppointment["googleCalendarEvent"]>,
) {
  const eventPath = `/calendar/v3/calendars/${encodeURIComponent(mapping.calendarId)}/events/${encodeURIComponent(mapping.googleEventId)}`;
  try {
    // Older events may already contain internal notes. Clear their description
    // before notifying guests of a cancellation, calendar move or disconnect.
    // If redaction fails, retain the mapping for a safe retry without notifying.
    await googleApiRequest(mapping.connection, `${eventPath}?sendUpdates=none`, {
      method: "PATCH",
      body: JSON.stringify({ description: "" }),
    });
    await googleApiRequest(
      mapping.connection,
      `${eventPath}?sendUpdates=all`,
      { method: "DELETE" },
    );
  } catch (error) {
    if (!(error instanceof GoogleCalendarApiError) || error.status !== 404) throw error;
  }
  await prisma.googleCalendarEvent.delete({ where: { id: mapping.id } });
}

async function recordConnectionError(connectionId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.googleCalendarConnection
    .update({ where: { id: connectionId }, data: { lastSyncError: message.slice(0, 2000) } })
    .catch(() => undefined);
  return message;
}

export async function syncAppointmentToGoogle(appointmentId: string) {
  const appointment = await appointmentForGoogle(appointmentId);
  if (!appointment) return { synced: false as const, reason: "appointment_not_found" };
  const existingMapping = appointment.googleCalendarEvent;

  if (appointment.status === "CANCELLED" || appointment.status === "AWAITING_PAYMENT") {
    if (!existingMapping) return { synced: false as const, reason: "event_not_required" };
    try {
      await deleteMappedGoogleEvent(existingMapping);
      return { synced: true as const, action: "deleted" as const };
    } catch (error) {
      const message = await recordConnectionError(existingMapping.connectionId, error);
      return { synced: false as const, reason: "delete_failed", error: message };
    }
  }

  const connection = selectAppointmentConnection(appointment);
  if (!connection) {
    return { synced: false as const, reason: "connection_not_found" };
  }

  try {
    if (
      existingMapping &&
      (existingMapping.connectionId !== connection.id ||
        existingMapping.calendarId !== connection.calendarId)
    ) {
      await deleteMappedGoogleEvent(existingMapping);
    }

    const event = await buildGoogleEvent(appointment, connection);
    const path = `/calendar/v3/calendars/${encodeURIComponent(connection.calendarId)}/events`;
    let response: Response;
    const canUpdateExisting =
      existingMapping?.connectionId === connection.id &&
      existingMapping.calendarId === connection.calendarId;

    if (canUpdateExisting) {
      try {
        response = await googleApiRequest(
          connection,
          `${path}/${encodeURIComponent(existingMapping.googleEventId)}?sendUpdates=all`,
          { method: "PUT", body: JSON.stringify(event) },
        );
      } catch (error) {
        if (!(error instanceof GoogleCalendarApiError) || error.status !== 404) throw error;
        response = await googleApiRequest(connection, `${path}?sendUpdates=all`, {
          method: "POST",
          body: JSON.stringify(event),
        });
      }
    } else {
      try {
        response = await googleApiRequest(connection, `${path}?sendUpdates=all`, {
          method: "POST",
          body: JSON.stringify(event),
        });
      } catch (error) {
        if (!(error instanceof GoogleCalendarApiError) || error.status !== 409) throw error;
        response = await googleApiRequest(
          connection,
          `${path}/${encodeURIComponent(event.id)}?sendUpdates=all`,
          { method: "PUT", body: JSON.stringify(event) },
        );
      }
    }

    const googleEvent = (await response.json()) as GoogleEventResponse;
    const eventId = googleEvent.id || event.id;
    await prisma.googleCalendarEvent.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        connectionId: connection.id,
        calendarId: connection.calendarId,
        googleEventId: eventId,
        googleEventUrl: googleEvent.htmlLink,
        etag: googleEvent.etag,
      },
      update: {
        connectionId: connection.id,
        calendarId: connection.calendarId,
        googleEventId: eventId,
        googleEventUrl: googleEvent.htmlLink,
        etag: googleEvent.etag,
        lastSyncedAt: new Date(),
        syncError: null,
      },
    });
    await prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
    return {
      synced: true as const,
      action: canUpdateExisting ? ("updated" as const) : ("created" as const),
      eventId,
    };
  } catch (error) {
    const message = await recordConnectionError(connection.id, error);
    if (existingMapping) {
      await prisma.googleCalendarEvent
        .update({
          where: { id: existingMapping.id },
          data: { syncError: message.slice(0, 2000) },
        })
        .catch(() => undefined);
    }
    console.error("[google-calendar] Appointment sync failed", {
      appointmentId,
      connectionId: connection.id,
      message,
    });
    return { synced: false as const, reason: "google_api_error", error: message };
  }
}

/**
 * Removes an appointment event before the local appointment row is deleted.
 * This keeps Google from retaining orphan events in regeneration workflows.
 */
export async function removeAppointmentFromGoogle(appointmentId: string) {
  const mapping = await prisma.googleCalendarEvent.findUnique({
    where: { appointmentId },
    include: { connection: true },
  });
  if (!mapping) return { removed: false as const, reason: "mapping_not_found" };

  try {
    await deleteMappedGoogleEvent(mapping);
    return { removed: true as const };
  } catch (error) {
    const message = await recordConnectionError(mapping.connectionId, error);
    await prisma.googleCalendarEvent
      .update({
        where: { id: mapping.id },
        data: { syncError: message.slice(0, 2000) },
      })
      .catch(() => undefined);
    return { removed: false as const, reason: "google_api_error", error: message };
  }
}

export async function syncRecurringBookingAppointments(recurringBookingId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { recurringBookingId },
    select: { id: true },
    orderBy: { startTime: "asc" },
  });
  return Promise.all(appointments.map((appointment) => syncAppointmentToGoogle(appointment.id)));
}

// Older OAuth grants include calendar.events but cannot call freeBusy. Read
// only availability fields from the same calendars with those existing grants.
async function readBusySlotsFromEvents(
  connection: GoogleCalendarConnection,
  selections: Array<{ calendarId: string }>,
  timeMin: Date,
  timeMax: Date,
) {
  const ranges: Array<{ startTime: Date; endTime: Date }> = [];
  for (const calendar of selections) {
    let pageToken: string | undefined;
    let pages = 0;
    do {
      if (++pages > 20) throw new Error("Google Calendar availability pagination limit exceeded");
      const query = new URLSearchParams({
        timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(),
        singleEvents: "true", showDeleted: "false", maxResults: "2500",
        fields: "timeZone,nextPageToken,items(status,transparency,start,end,attendees(self,responseStatus))",
      });
      if (pageToken) query.set("pageToken", pageToken);
      const response = await googleApiRequest(connection,
        `/calendar/v3/calendars/${encodeURIComponent(calendar.calendarId)}/events?${query}`);
      const data = await response.json() as {
        timeZone?: string; nextPageToken?: string;
        items?: Array<{
          status?: string; transparency?: string;
          start?: { dateTime?: string; date?: string };
          end?: { dateTime?: string; date?: string };
          attendees?: Array<{ self?: boolean; responseStatus?: string }>;
        }>;
      };
      if (!Array.isArray(data.items)) throw new Error("Invalid Google Calendar events response");
      for (const event of data.items) {
        if (event.status === "cancelled" || event.transparency === "transparent"
          || event.attendees?.some((attendee) => attendee.self && attendee.responseStatus === "declined")) continue;
        const parseTime = (value: typeof event.start) => value?.dateTime
          ? new Date(value.dateTime)
          : value?.date && data.timeZone ? fromZonedTime(`${value.date}T00:00:00`, data.timeZone) : new Date(NaN);
        const startTime = parseTime(event.start);
        const endTime = parseTime(event.end);
        if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime()) || endTime <= startTime) {
          throw new Error("Invalid Google Calendar event time range");
        }
        ranges.push({ startTime, endTime });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }
  return ranges;
}

export async function getGoogleCalendarBusySlots(
  staffId: string,
  timeMin: Date,
  timeMax: Date,
  businessId?: string,
) {
  let connection = await prisma.googleCalendarConnection.findFirst({
    where: { staffId, scope: "STAFF", syncEnabled: true, staff: { isActive: true } },
    orderBy: { updatedAt: "desc" },
  });
  if (!connection && businessId) {
    connection = await prisma.googleCalendarConnection.findFirst({
      where: { businessId, scope: "BUSINESS", syncEnabled: true },
      orderBy: { updatedAt: "desc" },
    });
  }
  if (!connection) return [];

  try {
    const selections = await readCalendarSelections(connection);
    let ranges: Array<{ startTime: Date; endTime: Date }>;
    try {
      const response = await googleApiRequest(connection, "/calendar/v3/freeBusy", {
        method: "POST",
        body: JSON.stringify({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: selections.map((calendar) => ({ id: calendar.calendarId })),
        }),
      });
      const data = (await response.json()) as {
        calendars?: Record<string, { errors?: unknown[]; busy?: Array<{ start?: string; end?: string }> }>;
      };
      for (const selected of selections) {
        const calendar = data.calendars?.[selected.calendarId];
        if (!calendar || calendar.errors?.length || !Array.isArray(calendar.busy)
          || calendar.busy.some(range => !range.start || !range.end || !Number.isFinite(Date.parse(range.start))
            || !Number.isFinite(Date.parse(range.end)) || Date.parse(range.end) <= Date.parse(range.start))) {
          throw new Error("Google Calendar FreeBusy returned an incomplete or failed calendar");
        }
      }
      ranges = selections.flatMap((calendar) => data.calendars?.[calendar.calendarId]?.busy ?? [])
        .filter((range) => range.start && range.end)
        .map((range) => ({
          startTime: new Date(range.start as string),
          endTime: new Date(range.end as string),
        }))
        .filter((range) => Number.isFinite(range.startTime.getTime()) && Number.isFinite(range.endTime.getTime()));
    } catch (error) {
      if (!(error instanceof GoogleCalendarApiError) || error.status !== 403) throw error;
      ranges = await readBusySlotsFromEvents(connection, selections, timeMin, timeMax);
    }
    ranges.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const merged: Array<{ startTime: Date; endTime: Date }> = [];
    for (const range of ranges) {
      const previous = merged[merged.length - 1];
      if (previous && range.startTime <= previous.endTime) {
        if (range.endTime > previous.endTime) previous.endTime = range.endTime;
      } else {
        merged.push({ ...range });
      }
    }
    return merged;
  } catch (error) {
    await recordConnectionError(connection.id, error);
    // A configured calendar is mandatory for availability. Failing closed
    // prevents a provider outage from exposing every slot as free.
    return [{ startTime: timeMin, endTime: timeMax }];
  }
}

export async function disconnectGoogleCalendarConnection(connectionId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { id: connectionId },
    include: { events: true },
  });
  if (!connection) return;

  for (const event of connection.events) {
    await deleteMappedGoogleEvent({ ...event, connection });
  }

  const token = connection.refreshTokenEncrypted
    ? decryptGoogleToken(connection.refreshTokenEncrypted)
    : decryptGoogleToken(connection.accessTokenEncrypted);
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
  await prisma.googleCalendarConnection.delete({ where: { id: connectionId } });
}

export async function runGoogleCalendarReconciliation(now = new Date(), businessId?: string) {
  const appointments = await prisma.appointment.findMany({
    where: {
      ...(businessId ? { businessId } : {}),
      OR: [
        {
          status: "CANCELLED",
          googleCalendarEvent: { isNot: null },
        },
        {
          status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
          startTime: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          business: { googleCalendarConnections: { some: { syncEnabled: true } } },
        },
      ],
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });
  const results = { checked: 0, synced: 0, errors: [] as string[] };
  for (const appointment of appointments) {
    results.checked++;
    const result = await syncAppointmentToGoogle(appointment.id);
    if (result.synced) results.synced++;
    if ("error" in result && result.error) {
      results.errors.push(`${appointment.id}: ${result.error}`);
    }
  }
  return results;
}
