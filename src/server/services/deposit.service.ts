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
};

const depositNotificationInclude = {
  service: true,
  staff: true,
  business: {
    include: { owner: { select: { email: true, name: true } } },
  },
} as const;

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
 * External I/O runs only after the transaction commits.
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

  if (shouldRunSideEffects) {
    for (const id of confirmedIds) {
      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: depositNotificationInclude,
      });
      if (!appointment) continue;
      try {
        await sendDepositConfirmedNotifications(appointment);
      } catch (error) {
        console.error("[deposit] Confirmation email failed after payment was persisted", {
          appointmentId: id,
          paymentId: input.paymentId,
          error,
        });
      }
      try {
        await syncAppointmentToGoogle(id);
      } catch (error) {
        console.error("[deposit] Google Calendar sync failed after payment was persisted", {
          appointmentId: id,
          paymentId: input.paymentId,
          error,
        });
      }
    }
  }

  return {
    alreadyProcessed: confirmedIds.length === 0 && auditedOnlyIds.length === 0,
    confirmedIds,
    auditedOnlyIds,
    shouldRunSideEffects,
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
  extraData?: {
    customerActionTokenHash?: null;
    customerActionTokenExpiresAt?: null;
    customerActionTokenUsedAt?: Date;
  };
}): Promise<DashboardCancelResult> {
  const cancelled = await prisma.appointment.updateMany({
    where: {
      id: input.appointmentId,
      businessId: input.businessId,
      status: { not: "CANCELLED" },
      paymentStatus: { not: "APPROVED" },
    },
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
