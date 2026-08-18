import { NextRequest, NextResponse } from "next/server";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getApiSessionUser } from "@/server/auth/user-session";
import { cloudinary } from "@/server/lib/cloudinary";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getAppointmentByIdAndBusiness } from "@/server/services/appointment.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

  const business = await getBusinessForUser(user.id);
  if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

  const appointment = await getAppointmentByIdAndBusiness(id, business.id);
  if (!appointment?.depositReceiptPublicId || !appointment.depositReceiptFormat) {
    return Response.json({ error: "Esta cita no tiene comprobante" }, { status: 404 });
  }

  const [agendaScope, permissions] = await Promise.all([
    getStaffAgendaScope(user, business),
    getEffectiveBusinessPermissions(user, business),
  ]);
  const canManage = permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL) || (
    !!appointment.staffId &&
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN) &&
    agendaScope.ownStaffId === appointment.staffId
  );
  if (!canManage) return Response.json({ error: "No tienes permisos para ver este comprobante" }, { status: 403 });

  const signedUrl = cloudinary.utils.private_download_url(
    appointment.depositReceiptPublicId,
    appointment.depositReceiptFormat,
    {
      resource_type: (appointment.depositReceiptResourceType || "image") as "image" | "raw" | "video",
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
      attachment: false,
    },
  );
  return NextResponse.redirect(signedUrl);
}
