import { NextRequest } from "next/server";

import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { canManageGoogleConnection } from "@/server/services/google-calendar-access.service";
import {
  disconnectGoogleCalendarConnection,
  listGoogleCalendars,
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
    | { connectionId?: string; calendarId?: string; includeCustomerAttendee?: boolean }
    | null;
  if (!body?.connectionId) return Response.json({ error: "Falta connectionId" }, { status: 400 });
  const context = await authorizedConnection(request, body.connectionId);
  if ("error" in context) return context.error;

  let calendarName: string | undefined;
  if (body.calendarId) {
    const calendars = await listGoogleCalendars(context.connection);
    const selected = calendars.find((calendar) => calendar.id === body.calendarId);
    if (!selected) return Response.json({ error: "Calendario no válido o sin permisos de escritura" }, { status: 400 });
    calendarName = selected.name;
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
  return Response.json({ connection });
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
