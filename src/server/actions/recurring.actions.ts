"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser, getStaffAgendaScope } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { addMonths } from "date-fns";
import {
  generateAppointments,
  detectAllConflicts,
  cancelFutureSessions,
  cancelSpecificSessions,
  regenerateFromDate,
  applyTimePunctual,
  applyTimePermanent,
  type SelectedTimes,
} from "@/server/services/recurring.service";
import {
  sendRecurringBookingCreatedClient,
  sendRecurringBookingPendingApprovalBusiness,
  sendRecurringBookingApprovedClient,
  sendRecurringBookingRejectedClient,
  sendRecurringBookingCancelledClient,
} from "@/server/email/send";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentSessionUser>>>;
type BusinessForUser = NonNullable<Awaited<ReturnType<typeof getBusinessForUser>>>;

async function recurringBookingWhereForAgenda(
  user: CurrentUser,
  business: BusinessForUser,
  recurringBookingId?: string
) {
  const agendaScope = await getStaffAgendaScope(user, business);

  return {
    ...(recurringBookingId ? { id: recurringBookingId } : {}),
    businessId: business.id,
    ...(agendaScope.canSeeAllAgendas
      ? {}
      : { staffId: agendaScope.staffId ?? "__no_staff_access__" }),
  };
}

// ==========================================
// PLAN CONFIG (negocio)
// ==========================================

export async function createRecurringPlanAction(
  serviceId: string,
  data: {
    mode: "FIXED_DAYS" | "DAYS_WITH_REST" | "FREE_MINIMUM";
    fixedDays?: number[];
    daysPerWeek?: number;
    minRestDays?: number;
    durationOptions: number[];
    startDateRangeDays?: number;
    requiresApproval: boolean;
    requiresHealthForm: boolean;
    healthQuestions?: string[];
    requiresRut?: boolean;
    renewalMessage?: string;
    expirationWarningDays?: number;
  }
) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  // Verify service belongs to this business
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id },
  });
  if (!service) return { error: "Servicio no encontrado" };

  await prisma.recurringPlan.upsert({
    where: { serviceId },
    create: {
      serviceId,
      mode: data.mode,
      fixedDays: data.fixedDays ?? [],
      daysPerWeek: data.daysPerWeek ?? null,
      minRestDays: data.minRestDays ?? null,
      durationOptions: data.durationOptions,
      startDateRangeDays: data.startDateRangeDays ?? 14,
      requiresApproval: data.requiresApproval,
      requiresHealthForm: data.requiresHealthForm,
      healthQuestions: data.healthQuestions ?? [],
      requiresRut: data.requiresRut ?? false,
      renewalMessage: data.renewalMessage ?? null,
      expirationWarningDays: data.expirationWarningDays ?? 7,
    },
    update: {
      mode: data.mode,
      fixedDays: data.fixedDays ?? [],
      daysPerWeek: data.daysPerWeek ?? null,
      minRestDays: data.minRestDays ?? null,
      durationOptions: data.durationOptions,
      startDateRangeDays: data.startDateRangeDays ?? 14,
      requiresApproval: data.requiresApproval,
      requiresHealthForm: data.requiresHealthForm,
      healthQuestions: data.healthQuestions ?? [],
      requiresRut: data.requiresRut ?? false,
      renewalMessage: data.renewalMessage ?? null,
      expirationWarningDays: data.expirationWarningDays ?? 7,
    },
  });

  revalidatePath("/dashboard/services");
  return { success: true };
}

export async function deleteRecurringPlanAction(serviceId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id },
  });
  if (!service) return { error: "Servicio no encontrado" };

  // Check if there are active bookings
  const activeCount = await prisma.recurringBooking.count({
    where: {
      serviceId,
      status: { in: ["ACTIVE", "PENDING_APPROVAL", "PAUSED"] },
    },
  });

  if (activeCount > 0) {
    return { error: `No puedes eliminar el plan mientras hay ${activeCount} suscripciones activas` };
  }

  await prisma.recurringPlan.delete({ where: { serviceId } });

  revalidatePath("/dashboard/services");
  return { success: true };
}

// ==========================================
// BOOKING CREATION (widget)
// ==========================================

export async function createRecurringBookingAction(data: {
  businessSlug: string;
  serviceId: string;
  staffId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  customerRut?: string;
  selectedDays: number[];
  selectedTimes: SelectedTimes;
  startDate: Date;
  durationMonths: number;
  healthAnswers?: Record<string, string>;
  healthFreeText?: string;
  healthAccepted?: boolean;
}) {
  // Load business
  const business = await prisma.business.findUnique({
    where: { slug: data.businessSlug },
    select: {
      id: true,
      name: true,
      owner: { select: { email: true, name: true } },
    },
  });
  if (!business) return { error: "Negocio no encontrado" };

  const normalizedPhone = data.customerPhone.trim();
  if (!/^\+?[0-9\s()-]{8,18}$/.test(normalizedPhone)) {
    return { error: "Telefono invalido" };
  }

  // Load service + plan
  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, businessId: business.id },
    include: { recurringPlan: true },
  });
  if (!service) return { error: "Servicio no encontrado" };
  if (!service.recurringPlan) return { error: "Este servicio no tiene plan recurrente configurado" };

  const plan = service.recurringPlan;

  // Validate durationOptions
  if (!plan.durationOptions.includes(data.durationMonths)) {
    return { error: "Duracion no valida para este plan" };
  }

  // Validate health form acceptance
  if (plan.requiresHealthForm && !data.healthAccepted) {
    return { error: "Debes aceptar los terminos del formulario de salud" };
  }

  // Validate day selection against plan mode constraints
  if (data.selectedDays.length === 0) {
    return { error: "Debes seleccionar al menos un dia" };
  }

  if (plan.mode === "FIXED_DAYS") {
    // All selected days must be in the plan's fixedDays list
    const invalidDays = data.selectedDays.filter((d) => !plan.fixedDays.includes(d));
    if (invalidDays.length > 0) {
      return { error: "Dias seleccionados no validos para este plan" };
    }
  } else if (plan.mode === "DAYS_WITH_REST") {
    // Must select exactly daysPerWeek days
    const required = plan.daysPerWeek ?? 1;
    if (data.selectedDays.length !== required) {
      return { error: `Debes seleccionar exactamente ${required} dia(s)` };
    }
    // Validate rest day constraint
    const minRest = plan.minRestDays ?? 1;
    const sorted = [...data.selectedDays].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const diff = Math.min(Math.abs(sorted[j] - sorted[i]), 7 - Math.abs(sorted[j] - sorted[i]));
        if (diff > 0 && diff <= minRest) {
          return { error: `Los dias seleccionados deben tener al menos ${minRest} dia(s) de descanso entre si` };
        }
      }
    }
  } else if (plan.mode === "FREE_MINIMUM") {
    // Must select at least daysPerWeek days
    const minDays = plan.daysPerWeek ?? 1;
    if (data.selectedDays.length < minDays) {
      return { error: `Debes seleccionar al menos ${minDays} dia(s) por semana` };
    }
  }

  // Calculate endDate
  const endDate = addMonths(data.startDate, data.durationMonths);
  endDate.setDate(endDate.getDate() - 1); // inclusive last day

  // Detect conflicts (informational, not blocking)
  const conflicts = await detectAllConflicts({
    businessId: business.id,
    staffId: data.staffId ?? null,
    startDate: data.startDate,
    endDate,
    selectedDays: data.selectedDays,
    selectedTimes: data.selectedTimes,
    serviceDurationMinutes: service.duration,
  });

  const conflictDates = conflicts.map((c) => c.date);

  // Find or create Client record
  let client = await prisma.client.findUnique({
    where: {
      businessId_email: {
        businessId: business.id,
        email: data.customerEmail.toLowerCase().trim(),
      },
    },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        businessId: business.id,
        name: data.customerName,
        email: data.customerEmail.toLowerCase().trim(),
        phone: normalizedPhone,
        rut: data.customerRut ?? null,
      },
    });
  } else if (data.customerRut && !client.rut) {
    await prisma.client.update({
      where: { id: client.id },
      data: { phone: normalizedPhone, rut: data.customerRut },
    });
  } else if (client.phone !== normalizedPhone) {
    await prisma.client.update({
      where: { id: client.id },
      data: { phone: normalizedPhone },
    });
  }

  // Generate management token
  const managementToken = crypto.randomBytes(24).toString("hex");

  // Determine initial status
  const initialStatus = plan.requiresApproval ? "PENDING_APPROVAL" : "ACTIVE";

  // Create RecurringBooking + Appointments in a transaction
  const recurringBooking = await prisma.$transaction(async (tx) => {
    const booking = await tx.recurringBooking.create({
      data: {
        businessId: business.id,
        serviceId: service.id,
        recurringPlanId: plan.id,
        staffId: data.staffId ?? null,
        clientId: client!.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail.toLowerCase().trim(),
        customerPhone: normalizedPhone,
        customerAddress: data.customerAddress ?? null,
        customerRut: data.customerRut ?? null,
        status: initialStatus,
        selectedDays: data.selectedDays,
        selectedTimes: data.selectedTimes,
        startDate: data.startDate,
        endDate,
        durationMonths: data.durationMonths,
        healthAnswers: data.healthAnswers ?? undefined,
        healthFreeText: data.healthFreeText ?? null,
        healthAccepted: data.healthAccepted ?? false,
        managementToken,
      },
    });

    // If not pending approval, generate appointments immediately
    if (initialStatus === "ACTIVE") {
      await generateAppointments({
        recurringBookingId: booking.id,
        businessId: business.id,
        serviceId: service.id,
        staffId: data.staffId ?? null,
        clientId: client!.id,
        customerName: data.customerName,
        customerEmail: data.customerEmail.toLowerCase().trim(),
        customerPhone: normalizedPhone,
        customerAddress: data.customerAddress,
        startDate: data.startDate,
        endDate,
        selectedDays: data.selectedDays,
        selectedTimes: data.selectedTimes,
        serviceDurationMinutes: service.duration,
        cancelledDates: conflictDates,
      });
    }

    return booking;
  });

  // Create RecurringSessionOverride records for detected conflicts
  if (conflicts.length > 0) {
    await prisma.recurringSessionOverride.createMany({
      data: conflicts.map((c) => ({
        recurringBookingId: recurringBooking.id,
        originalDate: c.date,
        action: "CANCELLED",
        reason: "Conflicto detectado al crear la suscripcion",
        requestedByClient: false,
      })),
    });
  }

  // Send emails (non-blocking)
  try {
    if (plan.requiresApproval) {
      // Email to business: new pending approval
      if (business.owner?.email) {
        await sendRecurringBookingPendingApprovalBusiness({
          ownerEmail: business.owner.email,
          ownerName: business.owner.name,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerAddress: data.customerAddress,
          serviceName: service.name,
          selectedDays: data.selectedDays,
          selectedTimes: data.selectedTimes,
          startDate: data.startDate,
          endDate,
          durationMonths: data.durationMonths,
          healthAnswers: data.healthAnswers,
          healthFreeText: data.healthFreeText,
          businessName: business.name,
        });
      }
    } else {
      // Email to client: booking confirmed
      await sendRecurringBookingCreatedClient({
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        serviceName: service.name,
        selectedDays: data.selectedDays,
        selectedTimes: data.selectedTimes,
        startDate: data.startDate,
        endDate,
        durationMonths: data.durationMonths,
        conflicts: conflictDates,
        managementToken,
        businessName: business.name,
      });
    }
  } catch (err) {
    console.error("[recurring.actions] Error sending emails:", err);
  }

  return {
    success: true,
    recurringBookingId: recurringBooking.id,
    managementToken,
    requiresApproval: plan.requiresApproval,
    conflicts: conflicts.map((c) => ({
      date: c.date.toISOString(),
      dayOfWeek: c.dayOfWeek,
      time: c.time,
      conflictType: c.conflictType,
    })),
  };
}

// ==========================================
// APPROVAL / REJECTION (dashboard negocio)
// ==========================================

export async function approveRecurringBookingAction(recurringBookingId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
    include: { service: true },
  });
  if (!booking) return { error: "Suscripcion no encontrada" };
  if (booking.status !== "PENDING_APPROVAL") return { error: "Esta suscripcion no esta pendiente de aprobacion" };

  // Generate appointments now that it's approved
  const selectedTimes = booking.selectedTimes as SelectedTimes;

  // Re-detect conflicts at approval time (schedule may have changed since request)
  const effectiveStartDate = booking.startDate < new Date() ? new Date() : booking.startDate;
  const conflicts = await detectAllConflicts({
    businessId: business.id,
    staffId: booking.staffId,
    startDate: effectiveStartDate,
    endDate: booking.endDate,
    selectedDays: booking.selectedDays,
    selectedTimes,
    serviceDurationMinutes: booking.service.duration,
  });
  const conflictDates = conflicts.map((c) => c.date);

  await prisma.$transaction(async (tx) => {
    await tx.recurringBooking.update({
      where: { id: recurringBookingId },
      data: { status: "ACTIVE" },
    });

    await generateAppointments({
      recurringBookingId,
      businessId: business.id,
      serviceId: booking.serviceId,
      staffId: booking.staffId,
      clientId: booking.clientId,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      customerAddress: booking.customerAddress,
      startDate: effectiveStartDate,
      endDate: booking.endDate,
      selectedDays: booking.selectedDays,
      selectedTimes,
      serviceDurationMinutes: booking.service.duration,
      cancelledDates: conflictDates,
    });
  });

  // Record conflict overrides
  if (conflicts.length > 0) {
    await prisma.recurringSessionOverride.createMany({
      data: conflicts.map((c) => ({
        recurringBookingId,
        originalDate: c.date,
        action: "CANCELLED",
        reason: "Conflicto detectado al aprobar la suscripcion",
        requestedByClient: false,
      })),
    });
  }

  try {
    await sendRecurringBookingApprovedClient({
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      serviceName: booking.service.name,
      startDate: booking.startDate,
      endDate: booking.endDate,
      managementToken: booking.managementToken ?? "",
      businessName: business.name,
    });
  } catch (err) {
    console.error("[recurring.actions] Error sending approval email:", err);
  }

  revalidatePath("/dashboard/recurring");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectRecurringBookingAction(recurringBookingId: string, reason: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
    include: { service: true },
  });
  if (!booking) return { error: "Suscripcion no encontrada" };
  if (booking.status !== "PENDING_APPROVAL") return { error: "Esta suscripcion no esta pendiente de aprobacion" };

  await prisma.recurringBooking.update({
    where: { id: recurringBookingId },
    data: { status: "CANCELLED", internalNotes: reason },
  });

  try {
    await sendRecurringBookingRejectedClient({
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      serviceName: booking.service.name,
      reason,
      businessName: business.name,
    });
  } catch (err) {
    console.error("[recurring.actions] Error sending rejection email:", err);
  }

  revalidatePath("/dashboard/recurring");
  revalidatePath("/dashboard");
  return { success: true };
}

// ==========================================
// CANCELLATION (dashboard negocio)
// ==========================================

export async function cancelFullRecurringAction(recurringBookingId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
    include: { service: true },
  });
  if (!booking) return { error: "Suscripcion no encontrada" };

  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: {
        recurringBookingId,
        status: { notIn: ["CANCELLED", "NO_SHOW", "CHECKED_IN", "COMPLETED"] },
      },
      data: { status: "CANCELLED" },
    }),
    prisma.recurringBooking.update({
      where: { id: recurringBookingId },
      data: { status: "CANCELLED" },
    }),
  ]);

  try {
    await sendRecurringBookingCancelledClient({
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      serviceName: booking.service.name,
      businessName: business.name,
    });
  } catch (err) {
    console.error("[recurring.actions] Error sending cancellation email:", err);
  }

  revalidatePath("/dashboard/recurring");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelFutureRecurringAction(recurringBookingId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
  });
  if (!booking) return { error: "Suscripcion no encontrada" };

  const now = new Date();
  await cancelFutureSessions(recurringBookingId, now);
  await prisma.recurringBooking.update({
    where: { id: recurringBookingId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/dashboard/recurring");
  return { success: true };
}

export async function cancelSpecificSessionsAction(recurringBookingId: string, dates: string[]) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
  });
  if (!booking) return { error: "Suscripcion no encontrada" };

  const parsedDates = dates.map((d) => new Date(d));
  await cancelSpecificSessions(recurringBookingId, parsedDates);

  revalidatePath("/dashboard/recurring");
  return { success: true };
}

// ==========================================
// TIME CHANGES (dashboard / widget gestion)
// ==========================================

export async function requestTimePunctualAction(params: {
  recurringBookingId: string;
  date: string;
  newTime: string;
  reason?: string;
  requestedByClient?: boolean;
}) {
  // Can be called from dashboard (auth check) or client portal (token validated upstream)
  const booking = await prisma.recurringBooking.findUnique({
    where: { id: params.recurringBookingId },
    include: { service: true, business: true },
  });
  if (!booking) return { error: "Suscripcion no encontrada" };

  try {
    await applyTimePunctual({
      recurringBookingId: params.recurringBookingId,
      targetDate: new Date(params.date),
      newTime: params.newTime,
      serviceDurationMinutes: booking.service.duration,
      reason: params.reason,
      requestedByClient: params.requestedByClient ?? false,
    });
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Error al cambiar la hora" };
  }

  revalidatePath("/dashboard/recurring");
  return { success: true };
}

export async function requestTimePermanentAction(params: {
  recurringBookingId: string;
  fromDate: string;
  newTimes: SelectedTimes;
  reason?: string;
  requestedByClient?: boolean;
}) {
  const booking = await prisma.recurringBooking.findUnique({
    where: { id: params.recurringBookingId },
    include: { service: true },
  });
  if (!booking) return { error: "Suscripcion no encontrada" };

  await applyTimePermanent({
    recurringBookingId: params.recurringBookingId,
    fromDate: new Date(params.fromDate),
    newTimes: params.newTimes,
    serviceDurationMinutes: booking.service.duration,
    reason: params.reason,
    requestedByClient: params.requestedByClient ?? false,
  });

  revalidatePath("/dashboard/recurring");
  return { success: true };
}

// ==========================================
// PAUSE / RESUME
// ==========================================

export async function pauseRecurringAction(recurringBookingId: string, pauseUntil: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
  });
  if (!booking) return { error: "Suscripcion no encontrada" };
  if (booking.status !== "ACTIVE") return { error: "Solo se puede pausar una suscripcion activa" };

  const pauseUntilDate = new Date(pauseUntil);
  const now = new Date();

  await cancelFutureSessions(recurringBookingId, now);
  await prisma.recurringBooking.update({
    where: { id: recurringBookingId },
    data: { status: "PAUSED", pausedUntil: pauseUntilDate },
  });

  revalidatePath("/dashboard/recurring");
  return { success: true };
}

export async function resumeRecurringAction(recurringBookingId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
    include: { service: true },
  });
  if (!booking) return { error: "Suscripcion no encontrada" };
  if (booking.status !== "PAUSED") return { error: "Esta suscripcion no esta pausada" };

  const resumeDate = new Date();

  // If endDate already passed, mark as completed instead of regenerating
  if (booking.endDate < resumeDate) {
    await prisma.recurringBooking.update({
      where: { id: recurringBookingId },
      data: { status: "COMPLETED", pausedUntil: null },
    });
    revalidatePath("/dashboard/recurring");
    return { error: "El plan ya expiro. Se marco como completado." };
  }

  const selectedTimes = booking.selectedTimes as SelectedTimes;

  await regenerateFromDate({
    recurringBookingId,
    fromDate: resumeDate,
    businessId: business.id,
    serviceId: booking.serviceId,
    staffId: booking.staffId,
    clientId: booking.clientId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    customerAddress: booking.customerAddress,
    endDate: booking.endDate,
    selectedDays: booking.selectedDays,
    selectedTimes,
    serviceDurationMinutes: booking.service.duration,
  });

  await prisma.recurringBooking.update({
    where: { id: recurringBookingId },
    data: { status: "ACTIVE", pausedUntil: null },
  });

  revalidatePath("/dashboard/recurring");
  return { success: true };
}

// ==========================================
// INTERNAL NOTES (dashboard negocio)
// ==========================================

export async function addInternalNoteAction(recurringBookingId: string, note: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
  });
  if (!booking) return { error: "Suscripcion no encontrada" };

  await prisma.recurringBooking.update({
    where: { id: recurringBookingId },
    data: { internalNotes: note },
  });

  revalidatePath("/dashboard/recurring");
  return { success: true };
}

// ==========================================
// QUERIES (dashboard negocio)
// ==========================================

export async function getRecurringBookingsForBusinessAction() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const bookings = await prisma.recurringBooking.findMany({
    where: await recurringBookingWhereForAgenda(user, business),
    orderBy: { createdAt: "desc" },
    include: {
      service: { select: { id: true, name: true, duration: true } },
      staff: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true } },
      _count: {
        select: {
          appointments: true,
          sessionOverrides: true,
        },
      },
    },
  });

  return { success: true, bookings };
}

export async function getRecurringBookingDetailAction(recurringBookingId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const booking = await prisma.recurringBooking.findFirst({
    where: await recurringBookingWhereForAgenda(user, business, recurringBookingId),
    include: {
      service: { select: { id: true, name: true, duration: true } },
      staff: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true, phone: true, rut: true, privateNotes: true } },
      recurringPlan: true,
      appointments: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },
      sessionOverrides: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) return { error: "Suscripcion no encontrada" };

  return { success: true, booking };
}
