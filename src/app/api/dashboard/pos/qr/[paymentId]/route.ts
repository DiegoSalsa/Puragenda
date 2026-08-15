import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { NextRequest } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import {
  findMercadoPagoCheckoutPayment,
  getMercadoPagoOrder,
  isMercadoPagoCheckoutPreferenceId,
  PosPaymentError,
  syncPosPaymentFromCheckout,
  syncPosPaymentFromOrder,
} from "@/server/services/mercadopago-pos.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";

function canCollectForAppointment(permissions: string[], ownStaffId: string | null, staffId: string | null) {
  if (permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL)) return true;
  return Boolean(
    staffId &&
    ownStaffId === staffId &&
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN),
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const { paymentId } = await params;
    const payment = await prisma.posPayment.findFirst({
      where: { id: paymentId, businessId: business.id },
      include: { appointment: { select: { staffId: true } } },
    });
    if (!payment) return Response.json({ error: "Cobro no encontrado" }, { status: 404 });

    const [permissions, agendaScope] = await Promise.all([
      getEffectiveBusinessPermissions(user, business),
      getStaffAgendaScope(user, business),
    ]);
    if (!canCollectForAppointment(permissions, agendaScope.ownStaffId, payment.appointment.staffId)) {
      return Response.json({ error: "No tienes permisos para consultar este cobro" }, { status: 403 });
    }
    if (!payment.providerOrderId) {
      return Response.json({ error: "El cobro aún no tiene una orden asociada" }, { status: 409 });
    }

    const accessToken = await getValidMercadoPagoAccessToken(business.id);
    if (!accessToken) throw new PosPaymentError("No se pudo renovar la conexión con Mercado Pago", 409);
    const updated = isMercadoPagoCheckoutPreferenceId(payment.providerOrderId)
      ? await syncPosPaymentFromCheckout(
          payment.id,
          await findMercadoPagoCheckoutPayment(accessToken, payment.externalReference),
        )
      : await syncPosPaymentFromOrder(
          payment.id,
          await getMercadoPagoOrder(accessToken, payment.providerOrderId),
        );
    return Response.json({
      id: updated.id,
      status: updated.status,
      statusDetail: updated.statusDetail,
      paidAt: updated.paidAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof PosPaymentError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[dashboard pos qr sync]", error);
    return Response.json({ error: "No se pudo actualizar el cobro" }, { status: 500 });
  }
}
