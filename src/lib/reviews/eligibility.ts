import { REVIEWABLE_APPOINTMENT_STATUSES } from "./constants";

export type ReviewEligibilityReason =
  | "ok"
  | "missing_appointment"
  | "business_mismatch"
  | "cancelled"
  | "no_show"
  | "not_completed"
  | "not_ended"
  | "business_unavailable"
  | "already_reviewed";

export type ReviewEligibility = {
  ok: boolean;
  reason: ReviewEligibilityReason;
};

const REASON_MESSAGES: Record<ReviewEligibilityReason, string> = {
  ok: "",
  missing_appointment: "No encontramos esa reserva.",
  business_mismatch: "No encontramos esa reserva.",
  cancelled: "Las reservas canceladas no se pueden valorar.",
  no_show: "Las reservas sin asistencia no se pueden valorar.",
  not_completed: "Solo puedes valorar una atención ya realizada.",
  not_ended: "Podrás valorar cuando termine tu atención.",
  business_unavailable: "Este negocio ya no está disponible.",
  already_reviewed: "Esta reserva ya tiene una valoración.",
};

export function reviewEligibilityMessage(reason: ReviewEligibilityReason) {
  return REASON_MESSAGES[reason];
}

export function canCustomerReviewAppointment(
  appointment: {
    id?: string | null;
    businessId: string;
    status: string;
    endTime: Date | string;
    business?: { deletedAt?: Date | string | null } | null;
    verifiedReview?: { id: string } | null;
  } | null | undefined,
  expectedBusinessId: string | null | undefined,
  now = new Date(),
): ReviewEligibility {
  if (!appointment) return { ok: false, reason: "missing_appointment" };
  if (expectedBusinessId && appointment.businessId !== expectedBusinessId) {
    return { ok: false, reason: "business_mismatch" };
  }
  if (appointment.business?.deletedAt) return { ok: false, reason: "business_unavailable" };
  if (appointment.verifiedReview) return { ok: false, reason: "already_reviewed" };
  if (appointment.status === "CANCELLED") return { ok: false, reason: "cancelled" };
  if (appointment.status === "NO_SHOW") return { ok: false, reason: "no_show" };
  if (!REVIEWABLE_APPOINTMENT_STATUSES.includes(appointment.status as (typeof REVIEWABLE_APPOINTMENT_STATUSES)[number])) {
    return { ok: false, reason: "not_completed" };
  }
  const endTime = appointment.endTime instanceof Date ? appointment.endTime : new Date(appointment.endTime);
  if (Number.isNaN(endTime.getTime()) || endTime.getTime() > now.getTime()) {
    return { ok: false, reason: "not_ended" };
  }
  return { ok: true, reason: "ok" };
}

export function sanitizeReviewText(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null;
  const cleaned = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

export function isSubstantialReviewEdit(input: {
  previousRating: number;
  nextRating: number;
  previousComment: string | null;
  nextComment: string | null;
}) {
  if (input.previousRating !== input.nextRating) return true;
  return (input.previousComment ?? "") !== (input.nextComment ?? "");
}
