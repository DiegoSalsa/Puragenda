import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";

export function privateDataAccess(permissions: readonly string[], ownStaffId: string | null, targetStaffId?: string | null) {
  return {
    crm: permissions.includes(P.CLIENTS_MANAGE),
    notes: permissions.includes(P.APPOINTMENT_NOTES_VIEW),
    health: permissions.includes(P.HEALTH_VIEW_ALL) || (!!ownStaffId && targetStaffId === ownStaffId && permissions.includes(P.HEALTH_VIEW_OWN)),
  };
}

/** Return a fresh DTO; never mutate Prisma rows used later by business logic. */
export function redactPrivateData<T extends object>(row: T, permissions: readonly string[], ownStaffId: string | null): T {
  const source = row as T & { staffId?: string | null; client?: object | null };
  const access = privateDataAccess(permissions, ownStaffId, source.staffId);
  const dto = { ...source } as Record<string, unknown>;
  if (!access.crm) { delete dto.privateNotes; delete dto.clientNotes; }
  if (!access.notes) delete dto.internalNotes;
  if (!access.health) for (const key of ["healthAnswers", "healthFreeText", "healthAccepted", "healthAcceptedAt", "healthConsentVersion", "healthConsentSnapshot"]) delete dto[key];
  for (const key of ["managementToken", "managementTokenHash", "tokenHash", "passwordHash", "customerActionTokenHash", "depositReceiptTokenHash"]) delete dto[key];
  if (source.client) {
    const client = { ...source.client } as Record<string, unknown>;
    dto.client = access.crm ? client : ("id" in client ? { id: client.id } : {});
  }
  return dto as T;
}

export function dashboardAppointmentDTO<T extends object>(row: T | null, permissions: readonly string[], ownStaffId: string | null) {
  if (!row) return null;
  const source = row as Record<string, unknown>;
  const fields = ["id", "businessId", "staffId", "clientId", "serviceId", "locationId", "updatedAt", "customerName", "customerEmail", "customerPhone", "customerAddress", "startTime", "endTime", "status", "paymentStatus", "depositAmount", "totalPrice", "totalDuration", "selectedOptions", "additionalServiceIds", "recurringBookingId", "internalNotes", "sessionBaseAmount", "tipAmount", "postSessionItems", "paymentMethod", "settledAt", "depositReceiptStatus", "depositReceiptOriginalName", "depositReceiptUploadedAt"];
  const dto = Object.fromEntries(fields.filter(key => key in source).map(key => [key, source[key]]));
  for (const key of ["service", "staff"]) {
    const related = source[key] as Record<string, unknown> | null;
    if (related) dto[key] = Object.fromEntries(["id", "name", "price", "duration"].filter(k => k in related).map(k => [k, related[k]]));
  }
  return redactPrivateData(dto, permissions, ownStaffId);
}
