import { prisma } from "@/backend/db/prisma";

/**
 * Verifica si existe una cita que colisione con el rango de tiempo dado
 * para un negocio específico.
 *
 * Colisión = cuando el nuevo intervalo [startTime, endTime) se superpone
 * con algún intervalo existente [existingStart, existingEnd).
 *
 * La lógica: dos intervalos se superponen si y solo si:
 *   newStart < existingEnd AND newEnd > existingStart
 */
export async function checkAppointmentCollision(
  businessId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
): Promise<{ hasCollision: boolean; conflictingAppointment?: { customerName: string; startTime: Date; endTime: Date } }> {
  const conflicting = await prisma.appointment.findFirst({
    where: {
      businessId,
      ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      // Overlap condition: newStart < existingEnd AND newEnd > existingStart
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: {
      customerName: true,
      startTime: true,
      endTime: true,
    },
  });

  return {
    hasCollision: !!conflicting,
    conflictingAppointment: conflicting ?? undefined,
  };
}

/**
 * Crea una cita validando previamente que no haya colisiones.
 */
export async function createAppointment(data: {
  customerName: string;
  customerEmail: string;
  startTime: Date;
  endTime: Date;
  businessId: string;
  serviceId: string;
}) {
  // Verificar colisión
  const { hasCollision, conflictingAppointment } = await checkAppointmentCollision(
    data.businessId,
    data.startTime,
    data.endTime
  );

  if (hasCollision) {
    return {
      success: false as const,
      error: `Ya existe una cita en ese horario (cliente: ${conflictingAppointment?.customerName}). Por favor selecciona otro horario.`,
    };
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      startTime: data.startTime,
      endTime: data.endTime,
      status: "PENDING",
      businessId: data.businessId,
      serviceId: data.serviceId,
    },
    include: {
      service: true,
    },
  });

  return { success: true as const, appointment };
}

/**
 * Obtener citas de un negocio con filtros opcionales.
 */
export async function getAppointments(
  businessId: string,
  filters?: { from?: Date; to?: Date }
) {
  return prisma.appointment.findMany({
    where: {
      businessId,
      ...(filters?.from && { startTime: { gte: filters.from } }),
      ...(filters?.to && { startTime: { lt: filters.to } }),
    },
    include: { service: true },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Obtener una cita por ID validando que pertenezca al negocio.
 */
export async function getAppointmentByIdAndBusiness(
  appointmentId: string,
  businessId: string
) {
  return prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      businessId,
    },
    include: { service: true },
  });
}

/**
 * Actualizar el estado de una cita.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: "PENDING" | "CONFIRMED"
) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: { service: true },
  });
}
