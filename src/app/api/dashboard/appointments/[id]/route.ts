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
import { managedAppointmentSchema } from "@/server/validations/appointment-management";
import { resolveManagedAppointment } from "@/server/services/appointment-management.service";

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
      const fullAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          service: true,
          staff: true,
          business: { include: { owner: { select: { email: true, name: true } } } },
        },
      });

      if (fullAppointment) {
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
          });
        }
      }
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

    if (parsed.data.sendConfirmation) await sendConfirmationEmail(updated);
    return Response.json(updated);
  } catch (error) {
    console.error("[dashboard appointments PUT]", error);
    return Response.json({ error: "No se pudo actualizar la cita" }, { status: 500 });
  }
}
