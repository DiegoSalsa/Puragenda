import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { sendDepositConfirmedNotifications } from "@/server/email/send";
import { createAuditLog } from "@/server/lib/audit";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";

export type DepositPaymentSource = "webhook" | "return" | "simulator";

export type DepositAppointmentRef = {
  id: string;
  businessId: string;
  mpPreferenceId: string | null;
  depositAmount: number | null;
};

export type ConfirmDepositPaymentResult = {
  alreadyProcessed: boolean;
  confirmedIds: string[];
  auditedOnlyIds: string[];
  shouldRunSideEffects: boolean;
  deliveryErrors: string[];
};

const depositNotificationInclude = {
  service: true,
  staff: true,
  business: {
    include: { owner: { select: { email: true, name: true } } },
  },
} as const;

const deliveryLeaseMs = 5 * 60 * 1000;

export type DepositCancellationEligibility = {
  allowedStatuses?: readonly AppointmentStatus[];
  actionToken?: string;
  customerActionTokenHash?: string;
  customerActionTokenUnused?: boolean;
  startTimeAfter?: Date;
};

/**
 * Shared predicate for every automatic appointment cancellation.
 * An approved deposit always needs an explicit/manual resolution; this
 * predicate is intentionally reusable inside caller-owned transactions too.
 */
export function depositSafeCancellationWhere(input: {
  appointmentId: string;
  businessId: string;
  eligibility?: DepositCancellationEligibility;
}): Prisma.AppointmentWhereInput {
  const eligibility = input.eligibility;
  return {
    id: input.appointmentId,
    businessId: input.businessId,
    paymentStatus: { not: "APPROVED" },
    status: eligibility?.allowedStatuses
      ? { in: [...eligibility.allowedStatuses] }
      : { not: "CANCELLED" },
    ...(eligibility?.actionToken ? { actionToken: eligibility.actionToken } : {}),
    ...(eligibility?.customerActionTokenHash
      ? { customerActionTokenHash: eligibility.customerActionTokenHash }
      : {}),
    ...(eligibility?.customerActionTokenUnused ? { customerActionTokenUsedAt: null } : {}),
    ...(eligibility?.startTimeAfter ? { startTime: { gt: eligibility.startTimeAfter } } : {}),
  };
}

export async function findRelatedDepositAppointments(appointment: DepositAppointmentRef) {
  if (!appointment.mpPreferenceId) {
    return [{ id: appointment.id, depositAmount: appointment.depositAmount }];
  }

  return prisma.appointment.findMany({
    where: {
      businessId: appointment.businessId,
      mpPreferenceId: appointment.mpPreferenceId,
    },
    select: { id: true, depositAmount: true },
    orderBy: { id: "asc" },
  });
}

/**
 * Atomically records an approved Mercado Pago deposit.
 *
 * Winner detection is the row count of conditional UPDATEs
 * (`paymentStatus = PENDING`). A second concurrent caller sees 0 rows
 * and must not run emails or Google Calendar sync.
 *
 * A durable delivery record is written in the same transaction. External I/O
 * runs after commit; repeated provider notifications and an authenticated
 * dashboard recovery action can safely retry an incomplete delivery.
 */
export async function confirmDepositPayment(input: {
  appointmentIds: string[];
  businessId: string;
  paymentId: string;
  source: DepositPaymentSource;
}): Promise<ConfirmDepositPaymentResult> {
  const appointmentIds = uniqueIds(input.appointmentIds);
  if (appointmentIds.length === 0) {
    return {
      alreadyProcessed: true,
      confirmedIds: [],
      auditedOnlyIds: [],
      shouldRunSideEffects: false,
      deliveryErrors: [],
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const confirmed = await tx.appointment.updateManyAndReturn({
      where: {
        id: { in: appointmentIds },
        businessId: input.businessId,
        paymentStatus: "PENDING",
        status: { not: "CANCELLED" },
      },
      data: {
        paymentStatus: "APPROVED",
        mpPaymentId: input.paymentId,
        status: "CONFIRMED",
      },
    });

    const audited = await tx.appointment.updateManyAndReturn({
      where: {
        id: { in: appointmentIds },
        businessId: input.businessId,
        paymentStatus: "PENDING",
        status: "CANCELLED",
      },
      data: {
        paymentStatus: "APPROVED",
        mpPaymentId: input.paymentId,
      },
    });

    if (confirmed.length > 0) {
      await tx.depositPaymentDelivery.createMany({
        data: confirmed.map((appointment) => ({
          appointmentId: appointment.id,
          paymentId: input.paymentId,
        })),
        skipDuplicates: true,
      });
    }

    return { confirmed, audited };
  });

  const confirmedIds = result.confirmed.map((row) => row.id);
  const auditedOnlyIds = result.audited.map((row) => row.id);
  const shouldRunSideEffects = confirmedIds.length > 0;

  if (auditedOnlyIds.length > 0) {
    await createAuditLog("DEPOSIT_APPROVED_AFTER_CANCEL", {
      appointmentIds: auditedOnlyIds,
      businessId: input.businessId,
      paymentId: input.paymentId,
      previousStatus: "CANCELLED",
      previousPaymentStatus: "PENDING",
      newStatus: "CANCELLED",
      newPaymentStatus: "APPROVED",
      source: input.source,
    });
  }

  // Do this even for a duplicate provider notification: the state transition
  // is idempotent, while a prior external email/calendar delivery may still
  // be pending. `force` ignores retry backoff but respects the active lease.
  const delivery = await processPendingDepositPaymentDeliveries({
    appointmentIds,
    businessId: input.businessId,
    force: true,
  });

  return {
    alreadyProcessed: confirmedIds.length === 0 && auditedOnlyIds.length === 0,
    confirmedIds,
    auditedOnlyIds,
    shouldRunSideEffects,
    deliveryErrors: delivery.errors,
  };
}

/**
 * Records a provider rejection/cancellation. Never overwrites APPROVED
 * and never changes appointment status.
 */
export async function rejectDepositPayment(input: {
  appointmentIds: string[];
  businessId: string;
  paymentId: string;
}) {
  const appointmentIds = uniqueIds(input.appointmentIds);
  if (appointmentIds.length === 0) return { rejectedIds: [] as string[] };

  const rejected = await prisma.appointment.updateManyAndReturn({
    where: {
      id: { in: appointmentIds },
      businessId: input.businessId,
      paymentStatus: "PENDING",
    },
    data: {
      paymentStatus: "REJECTED",
      mpPaymentId: input.paymentId,
    },
  });

  return { rejectedIds: rejected.map((row) => row.id) };
}

/**
 * Delivers the effects of confirmed deposits. A conditional lease prevents
 * simultaneous webhook, return, and dashboard recovery workers from delivering
 * the same event. Delivery is at-least-once: the database state is durable,
 * and failures can be retried by a duplicate provider notification or an
 * authenticated dashboard request without relying on a platform cron.
 */
export async function processPendingDepositPaymentDeliveries(input: {
  appointmentIds?: string[];
  businessId?: string;
  now?: Date;
  limit?: number;
  force?: boolean;
} = {}) {
  const now = input.now ?? new Date();
  const appointmentIds = input.appointmentIds ? uniqueIds(input.appointmentIds) : undefined;
  const deliveries = await prisma.depositPaymentDelivery.findMany({
    where: {
      ...(appointmentIds ? { appointmentId: { in: appointmentIds } } : {}),
      ...(input.businessId ? { appointment: { businessId: input.businessId } } : {}),
      ...(input.force ? {} : { nextAttemptAt: { lte: now } }),
      AND: [
        {
          OR: [
            { lockedUntil: null },
            { lockedUntil: { lte: now } },
          ],
        },
        {
          OR: [
            { ownerEmailDeliveredAt: null },
            { staffEmailDeliveredAt: null },
            { customerEmailDeliveredAt: null },
            { calendarSyncedAt: null },
          ],
        },
      ],
    },
    include: {
      appointment: { include: depositNotificationInclude },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: input.limit ?? 50,
  });

  const result = { checked: 0, delivered: 0, errors: [] as string[] };
  for (const delivery of deliveries) {
    const leaseUntil = new Date(now.getTime() + deliveryLeaseMs);
    const claimed = await prisma.depositPaymentDelivery.updateMany({
      where: {
        id: delivery.id,
        AND: [
          {
            OR: [
              { lockedUntil: null },
              { lockedUntil: { lte: now } },
            ],
          },
          {
            OR: [
              { ownerEmailDeliveredAt: null },
              { staffEmailDeliveredAt: null },
              { customerEmailDeliveredAt: null },
              { calendarSyncedAt: null },
            ],
          },
        ],
      },
      data: { lockedUntil: leaseUntil },
    });
    if (claimed.count !== 1) continue;
    result.checked++;

    let ownerEmailDelivered = Boolean(delivery.ownerEmailDeliveredAt);
    let staffEmailDelivered = Boolean(delivery.staffEmailDeliveredAt);
    let customerEmailDelivered = Boolean(delivery.customerEmailDeliveredAt);
    let calendarSynced = Boolean(delivery.calendarSyncedAt);
    const errors: string[] = [];

    if (!ownerEmailDelivered || !staffEmailDelivered || !customerEmailDelivered) {
      try {
        const notificationResult = await sendDepositConfirmedNotifications(delivery.appointment, {
          ownerDelivered: ownerEmailDelivered,
          staffDelivered: staffEmailDelivered,
          customerDelivered: customerEmailDelivered,
        });
        ownerEmailDelivered = notificationResult.ownerDelivered;
        staffEmailDelivered = notificationResult.staffDelivered;
        customerEmailDelivered = notificationResult.customerDelivered;
        if (notificationResult.failedRecipients.length > 0) {
          errors.push(`email delivery failed: ${notificationResult.failedRecipients.join(", ")}`);
        }
      } catch (error) {
        errors.push(`email delivery failed: ${formatDeliveryError(error)}`);
      }
    }

    if (!calendarSynced) {
      try {
        const calendar = await syncAppointmentToGoogle(delivery.appointmentId);
        // A later Google connection explicitly backfills all appointments, so
        // the absence of one is not a retryable failure for this delivery.
        calendarSynced = calendar.synced || calendar.reason === "connection_not_found";
        if (!calendarSynced) errors.push(`calendar sync failed: ${calendar.error ?? calendar.reason}`);
      } catch (error) {
        errors.push(`calendar sync failed: ${formatDeliveryError(error)}`);
      }
    }

    const failed = errors.length > 0;
    await prisma.depositPaymentDelivery.update({
      where: { id: delivery.id },
      data: {
        lockedUntil: null,
        ...(ownerEmailDelivered && !delivery.ownerEmailDeliveredAt
          ? { ownerEmailDeliveredAt: now }
          : {}),
        ...(staffEmailDelivered && !delivery.staffEmailDeliveredAt
          ? { staffEmailDeliveredAt: now }
          : {}),
        ...(customerEmailDelivered && !delivery.customerEmailDeliveredAt
          ? { customerEmailDeliveredAt: now }
          : {}),
        ...(calendarSynced && !delivery.calendarSyncedAt ? { calendarSyncedAt: now } : {}),
        ...(failed
          ? {
              attempts: { increment: 1 },
              lastError: errors.join("; ").slice(0, 2000),
              nextAttemptAt: retryAt(now, delivery.attempts),
            }
          : { lastError: null, nextAttemptAt: now }),
      },
    });

    if (failed) {
      result.errors.push(`${delivery.appointmentId}: ${errors.join("; ")}`);
    } else {
      result.delivered++;
    }
  }

  return result;
}

export type DashboardCancelResult =
  | { ok: true; alreadyCancelled?: boolean }
  | { ok: false; error: string; code: "NOT_FOUND" | "APPROVED" | "CONFLICT" };

/**
 * Administrative cancellation that cannot overwrite an approved deposit.
 * Normal appointments (`paymentStatus = NONE`) remain cancellable.
 */
export async function cancelAppointmentUnlessDepositApproved(input: {
  appointmentId: string;
  businessId: string;
  eligibility?: DepositCancellationEligibility;
  extraData?: {
    actionToken?: null;
    customerActionTokenHash?: null;
    customerActionTokenExpiresAt?: null;
    customerActionTokenUsedAt?: Date;
  };
}): Promise<DashboardCancelResult> {
  const cancelled = await prisma.appointment.updateMany({
    where: depositSafeCancellationWhere(input),
    data: {
      status: "CANCELLED",
      ...input.extraData,
    },
  });

  if (cancelled.count > 0) return { ok: true };

  const current = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, businessId: input.businessId },
    select: { status: true, paymentStatus: true },
  });

  if (!current) {
    return { ok: false, error: "Cita no encontrada", code: "NOT_FOUND" };
  }
  if (current.status === "CANCELLED") {
    return { ok: true, alreadyCancelled: true };
  }
  if (current.paymentStatus === "APPROVED") {
    return {
      ok: false,
      error: "No se puede cancelar una cita con abono aprobado. Requiere resolución manual.",
      code: "APPROVED",
    };
  }

  return {
    ok: false,
    error: "El estado de la cita cambió; actualiza la agenda",
    code: "CONFLICT",
  };
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function retryAt(now: Date, attempts: number) {
  const delayMinutes = Math.min(2 ** Math.min(attempts + 1, 8), 360);
  return new Date(now.getTime() + delayMinutes * 60 * 1000);
}

function formatDeliveryError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
