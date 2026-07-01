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
  customerPhone: string;
  startTime: Date;
  endTime: Date;
  businessId: string;
  serviceId: string;
  staffId?: string;
  clientId?: string;
  additionalServiceIds?: string[];
  totalDuration?: number;
  totalPrice?: number;
  depositRequired?: boolean;
  depositAmount?: number;
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

  // Check collision with schedule blocks (breaks)
  if (data.staffId) {
    const blockCollision = await prisma.scheduleBlock.findFirst({
      where: {
        staffId: data.staffId,
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime },
      },
    });
    if (blockCollision) {
      return {
        success: false as const,
        error: "El profesional tiene un bloqueo de horario en ese rango. Por favor selecciona otro horario.",
      };
    }
  }

  // Determine initial status based on deposit config
  const initialStatus = data.depositRequired ? "AWAITING_PAYMENT" : "PENDING";

  const appointment = await prisma.appointment.create({
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      startTime: data.startTime,
      endTime: data.endTime,
      status: initialStatus,
      businessId: data.businessId,
      serviceId: data.serviceId,
      staffId: data.staffId,
      clientId: data.clientId,
      additionalServiceIds: data.additionalServiceIds || [],
      totalDuration: data.totalDuration,
      totalPrice: data.totalPrice,
      depositAmount: data.depositRequired ? (data.depositAmount || 0) : null,
      paymentStatus: data.depositRequired ? "PENDING" : "NONE",
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
 * Includes BOTH existing appointments AND manual schedule blocks (breaks).
 */
export async function getBlockedSlots(
  businessId: string,
  dateStart: Date,
  dateEnd: Date,
  staffId?: string
) {
  // 1) Blocked by existing appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      ...(staffId && { staffId }),
      startTime: { lt: dateEnd },
      endTime: { gt: dateStart },
    },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  // 2) Blocked by manual schedule blocks (breaks, colación, etc.)
  const scheduleBlocks = staffId
    ? await prisma.scheduleBlock.findMany({
        where: {
          staffId,
          startTime: { lt: dateEnd },
          endTime: { gt: dateStart },
        },
        select: { startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
      })
    : [];

  // Merge both lists
  return [...appointments, ...scheduleBlocks].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );
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
  status: "PENDING" | "AWAITING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "COMPLETED" | "NO_SHOW"
) {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: { service: true, staff: true },
  });
}
