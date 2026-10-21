import { NextRequest } from "next/server";

import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { canManageGoogleConnection } from "@/server/services/google-calendar-access.service";
import {
  disconnectGoogleCalendarConnection,
  getGoogleCalendarReadSelections,
  listGoogleCalendarsForAvailability,
  setGoogleCalendarReadSelections,
  syncAppointmentToGoogle,
} from "@/server/services/google-calendar.service";

async function authorizedConnection(request: NextRequest, connectionId: string) {
  const user = await getApiSessionUser(request);
  if (!user) return { error: Response.json({ error: "No autenticado" }, { status: 401 }) };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: Response.json({ error: "Negocio no encontrado" }, { status: 404 }) };
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!connection || !(await canManageGoogleConnection(user, business, connection))) {
    return { error: Response.json({ error: "Sin permisos" }, { status: 403 }) };
  }
  return { connection, business };
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { connectionId?: string; calendarId?: string; readCalendarIds?: string[]; includeCustomerAttendee?: boolean }
    | null;
  if (!body?.connectionId) return Response.json({ error: "Falta connectionId" }, { status: 400 });
  if (body.readCalendarIds !== undefined && (!Array.isArray(body.readCalendarIds) || body.readCalendarIds.some((id) => typeof id !== "string" || id.length > 512))) {
    return Response.json({ error: "La selección de calendarios no es válida" }, { status: 400 });
  }
  const context = await authorizedConnection(request, body.connectionId);
  if ("error" in context) return context.error;

  let calendarName: string | undefined;
  const availableCalendars = await listGoogleCalendarsForAvailability(context.connection);
  const destinationId = body.calendarId ?? context.connection.calendarId;
  const destination = availableCalendars.find((calendar) => calendar.id === destinationId && calendar.canWrite);
  if (!destination) return Response.json({ error: "El calendario de destino no permite escribir eventos" }, { status: 400 });
  if (body.calendarId) calendarName = destination.name;
  const existingReadSelections = await getGoogleCalendarReadSelections(context.connection.id);
  const requestedReadIds = body.readCalendarIds ?? existingReadSelections.map((selection) => selection.calendarId);
  const readCalendars = availableCalendars.filter((calendar) => requestedReadIds.includes(calendar.id));
  if (requestedReadIds.some((id) => !availableCalendars.some((calendar) => calendar.id === id))) {
    return Response.json({ error: "Uno o más calendarios no permiten consultar disponibilidad" }, { status: 400 });
  }
  if (body.readCalendarIds !== undefined && readCalendars.length === 0) {
    return Response.json({ error: "Selecciona al menos un calendario para bloquear horarios" }, { status: 400 });
  }
  const connection = await prisma.googleCalendarConnection.update({
    where: { id: context.connection.id },
    data: {
      ...(body.calendarId && { calendarId: body.calendarId, calendarName }),
      ...(typeof body.includeCustomerAttendee === "boolean" && {
        includeCustomerAttendee: body.includeCustomerAttendee,
      }),
      lastSyncError: null,
    },
  });
  if (readCalendars.length === 0) {
    const destination = availableCalendars.find((calendar) => calendar.id === connection.calendarId);
    if (destination) readCalendars.push(destination);
  }
  await setGoogleCalendarReadSelections(connection, readCalendars);

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: connection.businessId,
      status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] },
      startTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ...(connection.staffId ? { staffId: connection.staffId } : {}),
    },
    select: { id: true },
    orderBy: { startTime: "asc" },
    take: 100,
  });
  for (const appointment of appointments) await syncAppointmentToGoogle(appointment.id);
  return Response.json({ connection, readCalendarIds: readCalendars.map((calendar) => calendar.id) });
}

export async function DELETE(request: NextRequest) {
  const connectionId = request.nextUrl.searchParams.get("connectionId");
  if (!connectionId) return Response.json({ error: "Falta connectionId" }, { status: 400 });
  const context = await authorizedConnection(request, connectionId);
  if ("error" in context) return context.error;
  try {
    await disconnectGoogleCalendarConnection(connectionId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo desconectar Google Calendar" },
      { status: 502 },
    );
  }
}
