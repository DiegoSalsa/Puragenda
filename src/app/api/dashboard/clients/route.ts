import { NextRequest } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { listClients } from "@/server/services/client.service";
import { parseClientListQuery } from "@/server/validations/pagination";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    }
    if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE))) {
      return Response.json({ error: "Sin permisos para gestionar clientes" }, { status: 403 });
    }

    const parsed = parseClientListQuery({
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        {
          error: "Parámetros inválidos",
          details: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const result = await listClients(business.id, parsed.data);
    return Response.json(result);
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json({ error: "Error del servidor" }, { status: 500 });
  }
}
