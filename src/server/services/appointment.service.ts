import { prisma } from "@/server/db/prisma";
import type { AppointmentStatus, Prisma } from "@prisma/client";
import { usesBusinessScheduleOnly } from "@/core/subscription-plan";
import { checkpointBookingOperation, fenceBookingOperation, bookingContractContext } from "@/server/booking/idempotency";
import { BookingSelectionError } from "@/core/booking-selection";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getPublicBlockingScheduleBlockWhere } from "@/server/services/schedule-block.service";
import {
  getGoogleCalendarBusySlots,
  syncAppointmentToGoogle,
} from "@/server/services/google-calendar.service";

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
  excludeAppointmentId?: string,
  locationId?: string | null,
  db: Prisma.TransactionClient = prisma,
  checkGoogle = true,
): Promise<{
  hasCollision: boolean;
  conflictingAppointment?: { customerName: string; startTime: Date; endTime: Date };
}> {
  const subscription = await db.subscription.findUnique({ where: { businessId }, select: { plan: true } });
  const businessOnly = usesBusinessScheduleOnly(subscription?.plan);
  const conflicting = await db.appointment.findFirst({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      ...(!businessOnly && staffId
        ? { OR: [{ staffId }, { staffId: null, ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}) }] }
        : locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
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

  if (conflicting) {
    return { hasCollision: true, conflictingAppointment: conflicting };
  }

  if (checkGoogle && (staffId || businessOnly)) {
    const staffIds = businessOnly
      ? (await db.staff.findMany({ where: { businessId, isActive: true, ...(locationId ? { locations: { some: { locationId, isActive: true } } } : {}) }, select: { id: true }, take: 100 })).map((item) => item.id)
      : [staffId!];
    const googleBusy = (await Promise.all(staffIds.map((id) => getGoogleCalendarBusySlots(id, startTime, endTime)))).flat();
    const ownGoogleEventRange = excludeAppointmentId
      ? await db.appointment.findUnique({
          where: { id: excludeAppointmentId },
          select: {
            startTime: true,
            endTime: true,
            googleCalendarEvent: { select: { id: true } },
          },
        })
      : null;
    const externalGoogleBusy = googleBusy.filter(
      (range) =>
        !ownGoogleEventRange?.googleCalendarEvent ||
        range.startTime.getTime() !== ownGoogleEventRange.startTime.getTime() ||
        range.endTime.getTime() !== ownGoogleEventRange.endTime.getTime(),
    );
    if (externalGoogleBusy.some((range) => startTime < range.endTime && endTime > range.startTime)) {
      return {
        hasCollision: true,
        conflictingAppointment: { customerName: "Google Calendar", startTime, endTime },
      };
    }
  }

  return { hasCollision: false };
}

/**
 * Create an appointment with collision detection.
 */
export async function createAppointment(data: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  startTime: Date;
  endTime: Date;
  businessId: string;
  locationId?: string;
  serviceId: string;
  staffId?: string;
  clientId?: string;
  additionalServiceIds?: string[];
  totalDuration?: number;
  totalPrice?: number;
  originalTotalPrice?: number;
  discountAmount?: number;
  giftCardPaidAmount?: number;
  promotionId?: string;
  promotionTitle?: string;
  bookingDiscountCodeId?: string;
  bookingDiscountCodeValue?: string;
  selectedOptions?: Prisma.InputJsonValue;
  depositRequired?: boolean;
  depositAmount?: number;
  depositPaymentUrl?: string | null;
  status?: AppointmentStatus;
  internalNotes?: string;
  allowPrioritySlots?: boolean;
  storyCampaignId?: string;
}, options?: { tx?: Prisma.TransactionClient; syncGoogle?: boolean }): Promise<
  { success: true; appointment: Prisma.AppointmentGetPayload<{ include: { service: true } }> }
  | { success: false; error: string; code?: string }
> {
  if (!options?.tx) {
    const external = await checkAppointmentCollision(data.businessId, data.startTime, data.endTime, data.staffId, undefined, data.locationId);
    if (external.hasCollision) return { success: false as const, error: "El horario seleccionado ya está ocupado. Por favor selecciona otro horario.", code: "SLOT_CONFLICT" };
    try {
      const result = await prisma.$transaction((tx) => createAppointment(data, { tx, syncGoogle: false }));
      if (result.success && options?.syncGoogle !== false) await syncAppointmentToGoogle(result.appointment.id);
      return result;
    } catch (error) {
      if (isAppointmentCapacityConflict(error)) return { success: false as const, error: "El horario seleccionado ya está ocupado. Por favor selecciona otro horario.", code: "SLOT_CONFLICT" };
      throw error;
    }
  }
  const db = options.tx;
  await fenceBookingOperation(db);
  await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booking-capacity:${data.businessId}`}, 0))::text`;
  if (bookingContractContext.getStore()) {
    const { getBookingAvailability, loadBookingContext } = await import("@/server/booking/read.service");
    const current = await loadBookingContext(data.businessId, db);
    const subscription = await db.subscription.findUnique({ where: { businessId: data.businessId } });
    if (!hasOperationalSubscriptionAccess(subscription)) throw new BookingSelectionError("Las reservas online no están disponibles temporalmente", "SUBSCRIPTION_INACTIVE", 403);
    const location = current.locations.find((item) => item.id === data.locationId);
    const timezone = location?.timezone || current.timezone;
    const optionIds = Array.isArray(data.selectedOptions) ? data.selectedOptions.map((option) => (option as { alternativeId: string }).alternativeId) : [];
    const availability = await getBookingAvailability(current, { date: format(toZonedTime(data.startTime, timezone), "yyyy-MM-dd"), serviceId: data.serviceId, locationId: data.locationId, staffId: data.staffId, selectedOptionAlternativeIds: optionIds }, new Date(), { db, skipBusy: true });
    if (availability.selection.price !== data.totalPrice || availability.selection.duration !== data.totalDuration) throw new BookingSelectionError("El catálogo cambió; consulta nuevamente", "SELECTION_CHANGED", 409);
    if (!availability.slots.some((slot) => slot.startTime === data.startTime.toISOString() && slot.endTime === data.endTime.toISOString())) throw new BookingSelectionError("El horario seleccionado ya no está disponible", "SLOT_CONFLICT", 409);
  }
  // Check collision for the specific staff member (or business-wide if no staff)
  const { hasCollision } = await checkAppointmentCollision(
    data.businessId,
    data.startTime,
    data.endTime,
    data.staffId,
    undefined,
    data.locationId,
    db,
    false,
  );

  if (hasCollision) {
    return {
      success: false as const,
      error: "El horario seleccionado ya está ocupado. Por favor selecciona otro horario.",
      code: "SLOT_CONFLICT",
    };
  }

  // Check collision with schedule blocks (breaks)
  const businessOnly = usesBusinessScheduleOnly((await db.subscription.findUnique({ where: { businessId: data.businessId }, select: { plan: true } }))?.plan);
  if (data.staffId || businessOnly) {
    const blockCollision = await db.scheduleBlock.findFirst({
      where: {
        ...(businessOnly ? { staff: { businessId: data.businessId } } : { staffId: data.staffId }),
        ...(data.locationId ? { OR: [{ locationId: data.locationId }, { locationId: null }] } : {}),
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime },
        ...(data.allowPrioritySlots
          ? { type: "UNAVAILABLE" as const }
          : getPublicBlockingScheduleBlockWhere()),
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
  const initialStatus = data.status ?? (data.depositRequired ? "AWAITING_PAYMENT" : "PENDING");

  const appointment = await db.appointment.create({
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      startTime: data.startTime,
      endTime: data.endTime,
      status: initialStatus,
      businessId: data.businessId,
      locationId: data.locationId,
      serviceId: data.serviceId,
      staffId: data.staffId,
      clientId: data.clientId,
      additionalServiceIds: data.additionalServiceIds || [],
      totalDuration: data.totalDuration,
      totalPrice: data.totalPrice,
      originalTotalPrice: data.originalTotalPrice,
      discountAmount: data.discountAmount,
      giftCardPaidAmount: data.giftCardPaidAmount ?? 0,
      promotionId: data.promotionId,
      promotionTitle: data.promotionTitle,
      bookingDiscountCodeId: data.bookingDiscountCodeId,
      bookingDiscountCodeValue: data.bookingDiscountCodeValue,
      selectedOptions: data.selectedOptions,
      depositAmount: data.depositRequired ? (data.depositAmount || 0) : null,
      depositPaymentUrl: data.depositRequired ? (data.depositPaymentUrl || null) : null,
      paymentStatus: data.depositRequired ? "PENDING" : "NONE",
      internalNotes: data.internalNotes?.trim() || null,
      storyCampaignId: data.storyCampaignId,
    },
    include: { service: true },
  });

  await checkpointBookingOperation(db, appointment);

  return { success: true as const, appointment };
}

export function isAppointmentCapacityConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const item = error as { code?: string; message?: string; cause?: unknown; meta?: unknown };
  return item.code === "23P01" || item.message?.includes("BOOKING_SLOT_CONFLICT") === true
    || (item.cause !== undefined && isAppointmentCapacityConflict(item.cause))
    || (item.meta !== undefined && JSON.stringify(item.meta).includes("BOOKING_SLOT_CONFLICT"));
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
  staffId?: string,
  locationId?: string,
) {
  const businessOnly = usesBusinessScheduleOnly((await prisma.subscription.findUnique({ where: { businessId }, select: { plan: true } }))?.plan);
  const effectiveStaffId = businessOnly ? undefined : staffId;
  // 1) Blocked by existing appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      status: { not: "CANCELLED" },
      ...(effectiveStaffId
        ? { OR: [{ staffId: effectiveStaffId }, { staffId: null, ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}) }] }
        : locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
      startTime: { lt: dateEnd },
      endTime: { gt: dateStart },
    },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  // 2) Blocked by manual schedule blocks (breaks, colación, etc.)
  const scheduleBlocks = effectiveStaffId || businessOnly
    ? await prisma.scheduleBlock.findMany({
        where: {
          ...(businessOnly ? { staff: { businessId } } : { staffId: effectiveStaffId }),
          ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
          startTime: { lt: dateEnd },
          endTime: { gt: dateStart },
          ...getPublicBlockingScheduleBlockWhere(),
        },
        select: { startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
      })
    : [];

  const internalStaffIds = businessOnly
    ? (await prisma.staff.findMany({ where: { businessId, isActive: true, ...(locationId ? { locations: { some: { locationId, isActive: true } } } : {}) }, select: { id: true }, take: 100 })).map((item) => item.id)
    : effectiveStaffId ? [effectiveStaffId] : [];
  const googleBusy = (await Promise.all(internalStaffIds.map((id) => getGoogleCalendarBusySlots(id, dateStart, dateEnd)))).flat();

  // Merge both lists
  return [...appointments, ...scheduleBlocks, ...googleBusy].sort(
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
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
    include: { service: true, staff: true },
  });
  await syncAppointmentToGoogle(appointmentId);
  return appointment;
}
