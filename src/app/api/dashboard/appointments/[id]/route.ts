import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getAppointmentByIdAndBusiness } from "@/server/services/appointment.service";
import {
  sendConfirmationEmail,
  sendCancellationEmail,
  sendAppointmentActionStaffNotification,
} from "@/server/email/send";
import { processLoyaltyStamps } from "@/server/actions/loyalty.actions";
import { prisma } from "@/server/db/prisma";
import { NextRequest } from "next/server";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { appointmentSettlementSchema, managedAppointmentSchema } from "@/server/validations/appointment-management";
import { resolveManagedAppointment } from "@/server/services/appointment-management.service";
import {
  removeAppointmentFromGoogle,
  syncAppointmentToGoogle,
} from "@/server/services/google-calendar.service";
import { cloudinary } from "@/server/lib/cloudinary";

function canManageTarget(
  permissions: string[],
  ownStaffId: string | null,
  targetStaffId: string | null,
) {
  if (permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL)) return true;
  return (
    !!targetStaffId &&
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN) &&
    ownStaffId === targetStaffId
  );
}

async function sendConfirmedAppointmentNotifications(appointmentId: string) {
  const fullAppointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      service: true,
      staff: true,
      business: { include: { owner: { select: { email: true, name: true } } } },
    },
  });

  if (!fullAppointment) return;
  await sendConfirmationEmail(fullAppointment);
  if (fullAppointment.staff?.email) {
    await sendAppointmentActionStaffNotification({
      action: "confirmed",
      customerName: fullAppointment.customerName,
      serviceName: fullAppointment.service.name,
      staffName: fullAppointment.staff.name,
      staffEmail: fullAppointment.staff.email,
      startTime: fullAppointment.startTime,
      endTime: fullAppointment.endTime,
      businessName: fullAppointment.business.name,
      timezone: fullAppointment.business.timezone,
    });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const existing = await getAppointmentByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Cita no encontrada" }, { status: 404 });

    const [agendaScope, permissions] = await Promise.all([
      getStaffAgendaScope(user, business),
      getEffectiveBusinessPermissions(user, business),
    ]);
    if (!canManageTarget(permissions, agendaScope.ownStaffId, existing.staffId)) {
      return Response.json({ error: "No tienes permisos para modificar esta cita" }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    if (body.settlement) {
      if (!canManageTarget(permissions, agendaScope.ownStaffId, existing.staffId)) {
        return Response.json({ error: "No tienes permisos para cerrar esta sesión" }, { status: 403 });
      }
      if (!["CHECKED_IN", "COMPLETED"].includes(existing.status)) {
        return Response.json({ error: "La sesión debe estar marcada como atendida antes de cerrarla" }, { status: 409 });
      }
      const parsedSettlement = appointmentSettlementSchema.safeParse(body.settlement);
      if (!parsedSettlement.success) {
        return Response.json({ error: parsedSettlement.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
      }

      const extrasTotal = parsedSettlement.data.items.reduce((sum, item) => sum + item.amount, 0);
      const finalTotal = Math.round((parsedSettlement.data.baseAmount + extrasTotal + parsedSettlement.data.tipAmount) * 100) / 100;
      const previousRecognizedAmount = existing.status === "CHECKED_IN" || existing.settledAt
        ? Number(existing.totalPrice ?? existing.service.price)
        : 0;

      await prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id },
          data: {
            status: "COMPLETED",
            sessionBaseAmount: parsedSettlement.data.baseAmount,
            tipAmount: parsedSettlement.data.tipAmount,
            postSessionItems: parsedSettlement.data.items,
            paymentMethod: parsedSettlement.data.paymentMethod ?? null,
            totalPrice: finalTotal,
            settledAt: new Date(),
            settledByUserId: user.id,
          },
        });
        const revenueDelta = finalTotal - previousRecognizedAmount;
        if (existing.clientId && revenueDelta !== 0) {
          await tx.client.update({ where: { id: existing.clientId }, data: { totalSpent: { increment: revenueDelta } } });
        }
      });

      return Response.json(await getAppointmentByIdAndBusiness(id, business.id));
    }

    if (body.markDepositPaid === true) {
      if (!existing.depositAmount || existing.depositAmount <= 0) {
        return Response.json({ error: "Esta cita no tiene un abono pendiente" }, { status: 409 });
      }
      if (existing.paymentStatus === "APPROVED") return Response.json(existing);
      if (existing.status !== "AWAITING_PAYMENT") {
        return Response.json({ error: "El abono de esta cita ya no está pendiente" }, { status: 409 });
      }

      const paidTransition = await prisma.appointment.updateMany({
        where: {
          id,
          status: "AWAITING_PAYMENT",
          paymentStatus: existing.paymentStatus,
        },
        data: {
          status: "CONFIRMED",
          paymentStatus: "APPROVED",
          ...(existing.depositReceiptStatus === "PENDING" && {
            depositReceiptStatus: "APPROVED",
            depositReceiptReviewedAt: new Date(),
            depositReceiptReviewedById: user.id,
          }),
        },
      });
      if (paidTransition.count === 0) {
        return Response.json({ error: "El estado del abono cambió; actualiza la agenda" }, { status: 409 });
      }

      await syncAppointmentToGoogle(id);
      await sendConfirmedAppointmentNotifications(id);
      return Response.json(await getAppointmentByIdAndBusiness(id, business.id));
    }

    if (body.rejectDepositReceipt === true) {
      if (existing.status !== "AWAITING_PAYMENT" || existing.paymentStatus !== "PENDING") {
        return Response.json({ error: "El abono de esta cita ya no está pendiente" }, { status: 409 });
      }
      if (existing.depositReceiptStatus !== "PENDING") {
        return Response.json({ error: "No hay un comprobante pendiente de revisión" }, { status: 409 });
      }

      const rejected = await prisma.appointment.updateMany({
        where: { id, status: "AWAITING_PAYMENT", paymentStatus: "PENDING", depositReceiptStatus: "PENDING" },
        data: {
          depositReceiptStatus: "REJECTED",
          depositReceiptReviewedAt: new Date(),
          depositReceiptReviewedById: user.id,
        },
      });
      if (rejected.count === 0) {
        return Response.json({ error: "El comprobante cambió de estado; actualiza la agenda" }, { status: 409 });
      }
      return Response.json(await getAppointmentByIdAndBusiness(id, business.id));
    }

    if (!status || !["PENDING", "CONFIRMED", "CANCELLED", "CHECKED_IN", "COMPLETED", "NO_SHOW"].includes(status)) {
      return Response.json(
        { error: "Estado inválido" },
        { status: 400 }
      );
    }

    if (existing.status === status) return Response.json(existing);

    const transition = await prisma.appointment.updateMany({
      where: { id, status: existing.status },
      data: {
        status,
        ...(status === "CANCELLED" && {
          customerActionTokenHash: null,
          customerActionTokenExpiresAt: null,
          customerActionTokenUsedAt: new Date(),
        }),
      },
    });
    if (transition.count === 0) {
      const current = await getAppointmentByIdAndBusiness(id, business.id);
      return Response.json(current ?? { error: "Cita no encontrada" }, { status: current ? 200 : 404 });
    }

    const appointment = await getAppointmentByIdAndBusiness(id, business.id);
    await syncAppointmentToGoogle(id);

    // ── CRM: Update Client stats based on status change ──
    if (existing.clientId) {
      if (status === "NO_SHOW") {
        // Incrementar contador de inasistencias
        await prisma.client.update({
          where: { id: existing.clientId },
          data: { noShowCount: { increment: 1 } },
        });
      }

      if (status === "CHECKED_IN") {
        // Add to totalSpent when checked in — fall back to service price if totalPrice not set
        const amount = existing.totalPrice || existing.service.price;
        if (amount > 0) {
          await prisma.client.update({
            where: { id: existing.clientId },
            data: { totalSpent: { increment: amount } },
          });
        }
      }

      // ── Loyalty: Process stamps when appointment is CHECKED_IN ──
      if (status === "CHECKED_IN") {
        processLoyaltyStamps(id).catch((err) =>
          console.error("Error processing loyalty stamps:", err)
        );
      }
    }

    // Send confirmation email when status changes to CONFIRMED
    if (status === "CONFIRMED") {
      await sendConfirmedAppointmentNotifications(id);
    }

    // Send cancellation email when status changes to CANCELLED
    if (status === "CANCELLED") {
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: true,
          staff: true,
          business: { include: { owner: { select: { email: true, name: true } } } },
        },
      });

      if (fullAppointment) {
        await sendCancellationEmail(fullAppointment);
        if (fullAppointment.staff?.email) {
          await sendAppointmentActionStaffNotification({
            action: "cancelled",
            customerName: fullAppointment.customerName,
            serviceName: fullAppointment.service.name,
            staffName: fullAppointment.staff.name,
            staffEmail: fullAppointment.staff.email,
            startTime: fullAppointment.startTime,
            endTime: fullAppointment.endTime,
            businessName: fullAppointment.business.name,
            timezone: fullAppointment.business.timezone,
          });
        }
      }
    }

    return Response.json(appointment);
  } catch (error) {
    console.error("[route] Error:", error);
    return Response.json(
      { error: "Error al actualizar la cita" },
      { status: 500 }
    );
  }
}

/**
 * Receipt files are detached from the appointment row after a successful
 * delete. Cloudinary is intentionally best-effort here: the appointment has
 * already been released and a transient provider error must not turn a
 * successful user action into a retry that could delete another row.
 */
async function cleanupDepositReceipt(
  appointmentId: string,
  publicId: string | null,
  resourceType: string | null,
) {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: (resourceType || "image") as "image" | "raw" | "video",
    });
  } catch (error) {
    console.error("[dashboard appointments DELETE] Receipt cleanup failed", {
      appointmentId,
      resourceType: resourceType || "image",
      error,
    });
  }
}

/**
 * Deletes only appointments whose deposit is still awaiting payment.
 *
 * The status and payment checks are repeated in the delete predicate so a
 * payment/status transition racing this request cannot result in deleting a
 * paid or otherwise managed appointment.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const existing = await getAppointmentByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Cita no encontrada" }, { status: 404 });

    const [agendaScope, permissions] = await Promise.all([
      getStaffAgendaScope(user, business),
      getEffectiveBusinessPermissions(user, business),
    ]);
    if (!canManageTarget(permissions, agendaScope.ownStaffId, existing.staffId)) {
      return Response.json({ error: "No tienes permisos para eliminar esta cita" }, { status: 403 });
    }

    if (existing.status !== "AWAITING_PAYMENT" || existing.paymentStatus !== "PENDING") {
      return Response.json(
        { error: "Solo se pueden eliminar citas esperando pago" },
        { status: 409 },
      );
    }

    // Remove the remote event before deleting the local mapping (which is
    // cascaded by Prisma). A provider failure aborts the delete so a retry
    // cannot leave an orphan event behind.
    const googleCleanup = await removeAppointmentFromGoogle(id);
    if (!googleCleanup.removed && googleCleanup.reason !== "mapping_not_found") {
      return Response.json(
        { error: "No se pudo liberar la cita del calendario externo. Intenta nuevamente." },
        { status: 502 },
      );
    }

    const deleted = await prisma.appointment.deleteMany({
      where: {
        id,
        businessId: business.id,
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        recurringBookingId: null,
      },
    });

    if (deleted.count === 0) {
      // Google cleanup happened before the conditional delete. If a payment
      // confirmation won that race, restore the event before returning so a
      // confirmed appointment is never left without its calendar event.
      if (googleCleanup.removed) {
        const restored = await syncAppointmentToGoogle(id);
        if (!restored.synced) {
          console.error("[dashboard appointments DELETE] Google event restore failed", {
            appointmentId: id,
            reason: restored.reason,
          });
        }
      }

      const current = await getAppointmentByIdAndBusiness(id, business.id);
      return Response.json(
        current
          ? { error: "El estado del abono cambió; actualiza la agenda" }
          : { error: "Cita no encontrada" },
        { status: current ? 409 : 404 },
      );
    }

    await cleanupDepositReceipt(
      id,
      existing.depositReceiptPublicId,
      existing.depositReceiptResourceType,
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("[dashboard appointments DELETE]", error);
    return Response.json({ error: "No se pudo eliminar la cita" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const existing = await getAppointmentByIdAndBusiness(id, business.id);
    if (!existing) return Response.json({ error: "Cita no encontrada" }, { status: 404 });
    if (existing.recurringBookingId) {
      return Response.json({ error: "Las sesiones recurrentes se administran desde Suscripciones" }, { status: 409 });
    }
    if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(existing.status)) {
      return Response.json({ error: "Esta cita ya no se puede editar" }, { status: 409 });
    }

    const parsed = managedAppointmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const [permissions, agendaScope] = await Promise.all([
      getEffectiveBusinessPermissions(user, business),
      getStaffAgendaScope(user, business),
    ]);
    if (
      !canManageTarget(permissions, agendaScope.ownStaffId, existing.staffId) ||
      !canManageTarget(permissions, agendaScope.ownStaffId, parsed.data.staffId)
    ) {
      return Response.json({ error: "No tienes permisos para mover esta cita a esa agenda" }, { status: 403 });
    }

    const resolved = await resolveManagedAppointment(business, parsed.data, id);
    if ("error" in resolved) return Response.json({ error: resolved.error }, { status: 409 });

    let client;
    if (parsed.data.clientId) {
      client = await prisma.client.findFirst({
        where: { id: parsed.data.clientId, businessId: business.id },
      });
      if (!client) return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    } else {
      client = await prisma.client.upsert({
        where: {
          businessId_email: {
            businessId: business.id,
            email: parsed.data.customerEmail,
          },
        },
        update: {
          name: parsed.data.customerName,
          phone: parsed.data.customerPhone || undefined,
        },
        create: {
          businessId: business.id,
          name: parsed.data.customerName,
          email: parsed.data.customerEmail,
          phone: parsed.data.customerPhone || null,
        },
      });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerPhone: parsed.data.customerPhone || null,
        clientId: client.id,
        serviceId: resolved.value.service.id,
        staffId: resolved.value.staff.id,
        startTime: resolved.value.startTime,
        endTime: resolved.value.endTime,
        totalDuration: resolved.value.totalDuration,
        totalPrice: resolved.value.totalPrice,
        originalTotalPrice: resolved.value.totalPrice,
        discountAmount: null,
        promotionId: null,
        promotionTitle: null,
        selectedOptions: resolved.value.selectedOptions,
        internalNotes: parsed.data.internalNotes || null,
        customerActionTokenHash: null,
        customerActionTokenExpiresAt: null,
        customerActionTokenUsedAt: null,
      },
      include: {
        service: true,
        staff: true,
        business: { include: { owner: { select: { email: true, name: true } } } },
      },
    });

    await syncAppointmentToGoogle(id);

    if (parsed.data.sendConfirmation) await sendConfirmationEmail(updated);
    return Response.json(updated);
  } catch (error) {
    console.error("[dashboard appointments PUT]", error);
    return Response.json({ error: "No se pudo actualizar la cita" }, { status: 500 });
  }
}
