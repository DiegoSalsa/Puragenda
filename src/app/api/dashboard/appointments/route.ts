import { NextRequest } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import { createAppointment } from "@/server/services/appointment.service";
import { resolveManagedAppointment } from "@/server/services/appointment-management.service";
import { managedAppointmentSchema } from "@/server/validations/appointment-management";
import { sendConfirmationEmail } from "@/server/email/send";

function canManageTarget(
  permissions: string[],
  ownStaffId: string | null,
  targetStaffId: string,
) {
  if (permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_ALL)) return true;
  return (
    permissions.includes(DASHBOARD_PERMISSIONS.APPOINTMENTS_MANAGE_OWN) &&
    ownStaffId === targetStaffId
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });

    const business = await getBusinessForUser(user.id);
    if (!business) return Response.json({ error: "Negocio no encontrado" }, { status: 404 });

    const parsed = managedAppointmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const [permissions, agendaScope] = await Promise.all([
      getEffectiveBusinessPermissions(user, business),
      getStaffAgendaScope(user, business),
    ]);
    if (!canManageTarget(permissions, agendaScope.ownStaffId, parsed.data.staffId)) {
      return Response.json({ error: "No tienes permisos para crear citas en esta agenda" }, { status: 403 });
    }

    const resolved = await resolveManagedAppointment(business, parsed.data);
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

    const created = await createAppointment({
      customerName: parsed.data.customerName,
      customerEmail: parsed.data.customerEmail,
      customerPhone: parsed.data.customerPhone,
      startTime: resolved.value.startTime,
      endTime: resolved.value.endTime,
      businessId: business.id,
      serviceId: resolved.value.service.id,
      staffId: resolved.value.staff.id,
      clientId: client.id,
      totalDuration: resolved.value.totalDuration,
      totalPrice: resolved.value.totalPrice,
      originalTotalPrice: resolved.value.totalPrice,
      selectedOptions: resolved.value.selectedOptions,
      status: "CONFIRMED",
      internalNotes: parsed.data.internalNotes,
      allowPrioritySlots: true,
    });

    if (!created.success) return Response.json({ error: created.error }, { status: 409 });

    if (parsed.data.sendConfirmation) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: created.appointment.id },
        include: {
          service: true,
          staff: true,
          business: { include: { owner: { select: { email: true, name: true } } } },
        },
      });
      if (appointment) await sendConfirmationEmail(appointment);
    }

    return Response.json(created.appointment, { status: 201 });
  } catch (error) {
    console.error("[dashboard appointments POST]", error);
    return Response.json({ error: "No se pudo crear la cita" }, { status: 500 });
  }
}
