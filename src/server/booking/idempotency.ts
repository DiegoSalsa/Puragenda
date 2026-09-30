import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { BookingSelectionError } from "@/core/booking-selection";

export const BOOKING_KEY_TTL_MS = 24 * 3600000;
export const BOOKING_LEASE_MS = 120000;
export const bookingOperationContext = new AsyncLocalStorage<{ id: string; ownerToken: string; currency: string }>();
export const bookingContractContext = new AsyncLocalStorage<boolean>();
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a.localeCompare(b));
    return "{" + entries.map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",") + "}";
  }
  return JSON.stringify(value);
}
export function bookingPayloadHash(payload: { selectedOptionAlternativeIds: string[]; serviceIds?: string[]; [key: string]: unknown }) {
  // Schema-parsed payload: unknown fields and body API key are already stripped.
  return hash(stable({ ...payload, serviceIds: payload.serviceIds?.length === 1 && payload.serviceIds[0] === payload.serviceId ? undefined : payload.serviceIds,
    startTime: typeof payload.startTime === "string" ? new Date(payload.startTime).toISOString() : payload.startTime,
    endTime: typeof payload.endTime === "string" ? new Date(payload.endTime).toISOString() : payload.endTime,
    selectedOptionAlternativeIds: [...payload.selectedOptionAlternativeIds].sort() }));
}
export async function claimBookingOperation(businessId: string, key: string, payloadHash: string, now = new Date()) {
  if (!/^[\x21-\x7e]{8,128}$/.test(key)) throw new BookingSelectionError("Idempotency-Key debe tener entre 8 y 128 caracteres ASCII", "INVALID_IDEMPOTENCY_KEY");
  const keyHash = hash(key);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booking-operation:${businessId}:${keyHash}`}, 0))::text`;
    const existing = await tx.bookingOperation.findUnique({ where: { businessId_keyHash: { businessId, keyHash } } });
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new BookingSelectionError("La clave ya pertenece a otra solicitud", "IDEMPOTENCY_PAYLOAD_CONFLICT", 409);
      // Expiry is a tombstone, never permission to silently create another booking.
      if (existing.expiresAt <= now) throw new BookingSelectionError("La clave ha caducado; consulta el resultado antes de una nueva reserva", "IDEMPOTENCY_EXPIRED", 409);
      if (existing.completedAt) return { kind: "replay" as const, operation: existing };
      if (existing.leaseUntil > now) throw new BookingSelectionError("La reserva sigue en curso", "BOOKING_IN_PROGRESS", 409);
      if (existing.appointmentId) return { kind: "recover" as const, operation: existing };
      const operation = await tx.bookingOperation.update({ where: { id: existing.id }, data: { ownerToken: randomUUID(), leaseUntil: new Date(now.getTime() + BOOKING_LEASE_MS) } });
      return { kind: "execute" as const, operation };
    }
    const operation = await tx.bookingOperation.create({ data: { businessId, keyHash, payloadHash, ownerToken: randomUUID(), leaseUntil: new Date(now.getTime() + BOOKING_LEASE_MS), expiresAt: new Date(now.getTime() + BOOKING_KEY_TTL_MS) } });
    return { kind: "execute" as const, operation };
  });
}

/** Runs under the appointment transaction BEFORE insert, fences an expired worker. */
export async function fenceBookingOperation(tx: Prisma.TransactionClient) {
  const operation = bookingOperationContext.getStore();
  if (!operation) return;
  // An UPDATE takes the row lock and fences the owner atomically, while Prisma
  // keeps the configured database schema qualified (also for isolated tests).
  const updated = await tx.bookingOperation.updateMany({ where: { id: operation.id, ownerToken: operation.ownerToken, leaseUntil: { gt: new Date() }, appointmentId: null }, data: { ownerToken: operation.ownerToken } });
  if (!updated.count) throw new BookingSelectionError("La operación ya fue procesada o su plazo venció", "BOOKING_IN_PROGRESS", 409);
}

export function bookingResult(appointment: { id: string; status: string; startTime: Date; endTime: Date; staffId: string | null; locationId: string | null; totalPrice: number | null; totalDuration: number | null; depositAmount: number | null }, currency: string, paymentUrl: string | null = null) {
  return { id: appointment.id, status: appointment.status,
    depositRequired: appointment.status === "AWAITING_PAYMENT", paymentUrl,
    booking: { version: "1", state: appointment.status === "CONFIRMED" ? "confirmed" : appointment.status === "AWAITING_PAYMENT" ? "awaiting_payment" : appointment.status === "CANCELLED" ? "cancelled" : "pending",
      startTime: appointment.startTime.toISOString(), endTime: appointment.endTime.toISOString(), staffId: appointment.staffId, locationId: appointment.locationId,
      price: appointment.totalPrice, duration: appointment.totalDuration, currency, depositAmount: appointment.depositAmount ?? 0 },
  };
}
export async function checkpointBookingOperation(tx: Prisma.TransactionClient, appointment: Parameters<typeof bookingResult>[0]) {
  const operation = bookingOperationContext.getStore();
  if (!operation) return;
  await tx.bookingOperation.update({ where: { id: operation.id }, data: { appointmentId: appointment.id, response: bookingResult(appointment, operation.currency), httpStatus: 201 } });
}
export async function completeBookingOperation(response: Response) {
  const operation = bookingOperationContext.getStore();
  if (!operation) return;
  // Minimal external contract; legacy clients continue receiving their old fields.
  const body = await response.clone().json();
  await prisma.bookingOperation.updateMany({ where: { id: operation.id, ownerToken: operation.ownerToken }, data: { response: body as Prisma.InputJsonValue, httpStatus: response.status, completedAt: new Date() } });
}

/** Save an updated payment checkpoint before any notification or HTTP response. */
export async function checkpointBookingResponse(appointment: Parameters<typeof bookingResult>[0], currency: string, paymentUrl: string | null) {
  const operation = bookingOperationContext.getStore();
  if (!operation) return;
  await prisma.bookingOperation.updateMany({ where: { id: operation.id, ownerToken: operation.ownerToken }, data: { response: bookingResult(appointment, currency, paymentUrl), httpStatus: 201 } });
}
