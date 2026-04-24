import { prisma } from "@/server/db/prisma";

/**
 * Verifica si existe una cita que colisione con el rango de tiempo dado
 * para un negocio y staff específico.
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
  staffId?: string | null,
  excludeAppointmentId?: string
): Promise<{
  hasCollision: boolean;
  conflictingAppointment?: { customerName: string; startTime: Date; endTime: Date };
}> {
  const conflicting = await prisma.appointment.findFirst({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      ...(staffId && { staffId }),
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
 * Create an appointment with collision detection.
 */
export async function createAppointment(data: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startTime: Date;
  endTime: Date;
  businessId: string;
  serviceId: string;
  staffId?: string;
}) {
  // Check collision for the specific staff member (or business-wide if no staff)
  const { hasCollision, conflictingAppointment } = await checkAppointmentCollision(
    data.businessId,
    data.startTime,
    data.endTime,
    data.staffId
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
      customerPhone: data.customerPhone,
      startTime: data.startTime,
      endTime: data.endTime,
      status: "PENDING",
      businessId: data.businessId,
      serviceId: data.serviceId,
      staffId: data.staffId,
    },
    include: { service: true },
  });

  return { success: true as const, appointment };
}

/**
 * Get appointments for a business with optional filters.
 */
export async function getAppointments(
  businessId: string,
  filters?: { from?: Date; to?: Date; staffId?: string }
) {
  return prisma.appointment.findMany({
    where: {
      businessId,
      ...(filters?.staffId && { staffId: filters.staffId }),
      ...(filters?.from && { startTime: { gte: filters.from } }),
      ...(filters?.to && { startTime: { lt: filters.to } }),
    },
    include: { service: true, staff: true },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Get blocked time slots for a specific date and business.
 * Returns only time ranges (no customer data) for the widget.
 */
export async function getBlockedSlots(
  businessId: string,
  dateStart: Date,
  dateEnd: Date,
  staffId?: string
) {
  return prisma.appointment.findMany({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      ...(staffId && { staffId }),
      startTime: { gte: dateStart },
      endTime: { lte: dateEnd },
    },
    select: {
      startTime: true,
      endTime: true,
    },
    orderBy: { startTime: "asc" },
  });
}

/**
 * Get an appointment by ID, verifying it belongs to the business.
 */
export async function getAppointmentByIdAndBusiness(
  appointmentId: string,
  businessId: string
) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, businessId },
    include: { service: true, staff: true },
  });
}

/**
 * Update appointment status.
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: { service: true, staff: true },
  });
}
