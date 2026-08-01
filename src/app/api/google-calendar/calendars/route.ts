import { NextRequest } from "next/server";

import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { canManageGoogleConnection } from "@/server/services/google-calendar-access.service";
import { listGoogleCalendars } from "@/server/services/google-calendar.service";

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
  const connectionId = request.nextUrl.searchParams.get("connectionId");
  if (!connectionId) return Response.json({ error: "Falta connectionId" }, { status: 400 });
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!connection || !(await canManageGoogleConnection(user, business, connection))) {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    return Response.json({ calendars: await listGoogleCalendars(connection) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar los calendarios" },
      { status: 502 },
    );
  }
}
