import QRCode from "qrcode";
import { NextRequest } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { getValidMercadoPagoAccessToken } from "@/server/services/mercadopago-oauth.service";
import {
  calculateAppointmentBalance,
  createMercadoPagoCheckoutPreference,
  createMercadoPagoQrOrder,
  mercadoPagoPosExternalId,
  newPosProviderIdentifiers,
  PosPaymentError,
  posQrExpiresAt,
  validateMercadoPagoOrder,
} from "@/server/services/mercadopago-pos.service";
import { createPosQrPaymentSchema } from "@/server/validations/pos-payment";

function canCollectForAppointment(permissions: string[], ownStaffId: string | null, staffId: string | null) {
  if (permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL)) return true;
  return Boolean(
    staffId &&
    ownStaffId === staffId &&
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN),
  );
}

async function serializeQrPayment(payment: {
  id: string;
  amount: number;
  currency: string;
  status: string;
  statusDetail: string | null;
  qrData: string | null;
  expiresAt: Date | null;
}) {
  return {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    statusDetail: payment.statusDetail,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    qrImageDataUrl: payment.qrData
      ? await QRCode.toDataURL(payment.qrData, { errorCorrectionLevel: "M", margin: 2, width: 320 })
      : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
    if (!business.depositRequired) {
      return Response.json({ error: "El POS requiere abonos mediante Mercado Pago" }, { status: 409 });
    }
    if (!business.mpAccessToken || !business.mpUserId) {
      return Response.json({ error: "Conecta Mercado Pago antes de usar el POS" }, { status: 409 });
    }

    const parsed = createPosQrPaymentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Solicitud inválida" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: parsed.data.appointmentId, businessId: business.id },
      include: {
        service: { select: { price: true } },
        posPayments: { where: { status: "APPROVED" }, select: { amount: true } },
      },
    });
    if (!appointment) return Response.json({ error: "Cita no encontrada" }, { status: 404 });

    const [permissions, agendaScope] = await Promise.all([
      getEffectiveBusinessPermissions(user, business),
      getStaffAgendaScope(user, business),
    ]);
    if (!canCollectForAppointment(permissions, agendaScope.ownStaffId, appointment.staffId)) {
      return Response.json({ error: "No tienes permisos para cobrar esta cita" }, { status: 403 });
    }
    if (!["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(appointment.status)) {
      return Response.json({ error: "La cita debe estar confirmada para cobrar el saldo" }, { status: 409 });
    }
    if (appointment.paymentStatus !== "APPROVED" || !appointment.depositAmount) {
      return Response.json({ error: "El abono debe estar aprobado antes de cobrar el saldo" }, { status: 409 });
    }

    const now = new Date();
    await prisma.posPayment.updateMany({
      where: {
        appointmentId: appointment.id,
        status: { in: ["CREATING", "PENDING"] },
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED", statusDetail: "local_expiration" },
    });
    const activePayment = await prisma.posPayment.findFirst({
      where: {
        appointmentId: appointment.id,
        status: { in: ["CREATING", "PENDING"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (activePayment?.qrData) return Response.json(await serializeQrPayment(activePayment));
    if (activePayment) {
      return Response.json({ error: "Ya se está creando un cobro para esta cita" }, { status: 409 });
    }

    const totalPrice = appointment.totalPrice ?? appointment.service.price;
    const approvedPosAmount = appointment.posPayments.reduce((total, payment) => total + payment.amount, 0);
    const amount = calculateAppointmentBalance({
      totalPrice,
      depositAmount: appointment.depositAmount,
      approvedPosAmount,
    });
    if (amount <= 0) {
      return Response.json({ error: "Esta cita no tiene saldo pendiente" }, { status: 409 });
    }

    const identifiers = newPosProviderIdentifiers();
    const expiresAt = posQrExpiresAt();
    let localPayment;
    try {
      localPayment = await prisma.posPayment.create({
        data: {
          businessId: business.id,
          appointmentId: appointment.id,
          createdByUserId: user.id,
          amount,
          currency: business.currencyCode,
          externalReference: identifiers.externalReference,
          idempotencyKey: identifiers.idempotencyKey,
          expiresAt,
        },
      });
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
        return Response.json({ error: "Ya existe un cobro activo para esta cita" }, { status: 409 });
      }
      throw error;
    }

    try {
      const accessToken = await getValidMercadoPagoAccessToken(business.id);
      if (!accessToken) throw new PosPaymentError("No se pudo renovar la conexión con Mercado Pago", 409);
      let providerOrderId: string;
      let providerPaymentId: string | null;
      let providerUserId: string;
      let qrData: string;
      let statusDetail: string;

      try {
        const order = await createMercadoPagoQrOrder({
          accessToken,
          amount,
          externalReference: identifiers.externalReference,
          idempotencyKey: identifiers.idempotencyKey,
          externalPosId: mercadoPagoPosExternalId(business.mpUserId),
        });
        validateMercadoPagoOrder({
          order,
          providerUserId: business.mpUserId,
          externalReference: identifiers.externalReference,
          amount,
          currency: business.currencyCode,
        });
        providerOrderId = order.id!;
        providerPaymentId = order.transactions?.payments?.[0]?.id ?? null;
        providerUserId = String(order.user_id);
        qrData = order.type_response!.qr_data!;
        statusDetail = order.status_detail ?? "created";
      } catch (orderError) {
        if (!(orderError instanceof PosPaymentError) || ![401, 403].includes(orderError.providerStatus ?? 0)) {
          throw orderError;
        }
        const preference = await createMercadoPagoCheckoutPreference({
          accessToken,
          amount,
          currency: business.currencyCode,
          externalReference: identifiers.externalReference,
          idempotencyKey: identifiers.idempotencyKey,
          expiresAt,
        });
        providerOrderId = preference.id!;
        providerPaymentId = null;
        providerUserId = String(preference.collector_id ?? business.mpUserId);
        qrData = preference.init_point!;
        statusDetail = "checkout_preference";
      }
      const payment = await prisma.posPayment.update({
        where: { id: localPayment.id },
        data: {
          status: "PENDING",
          providerOrderId,
          providerPaymentId,
          providerUserId,
          qrData,
          statusDetail,
          lastSyncedAt: new Date(),
        },
      });
      return Response.json(await serializeQrPayment(payment), { status: 201 });
    } catch (error) {
      await prisma.posPayment.update({
        where: { id: localPayment.id },
        data: {
          status: "FAILED",
          failureReason: error instanceof Error ? error.message.slice(0, 500) : "Error desconocido",
        },
      });
      throw error;
    }
  } catch (error) {
    if (error instanceof PosPaymentError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[dashboard pos qr]", error);
    return Response.json({ error: "No se pudo generar el cobro QR" }, { status: 500 });
  }
}
