import { z } from "zod";
import { NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { loadBookingContext, getBookingAvailability } from "@/server/booking/read.service";
import { executeBooking } from "@/server/booking/create-http";
import { bookingExpectedQuoteContext, bookingReviewContext } from "@/server/booking/idempotency";
import { cancelAppointmentUnlessDepositApproved } from "@/server/services/deposit.service";
import { validateAppointmentReschedule, rescheduleAppointmentWithinTransaction } from "@/server/services/appointment-management.service";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import { appointmentScope, requireAgenda } from "@/server/puri/context";
import { bookingSchema } from "@/server/validations/booking";
import { authorizedContext, requireWrite, type McpIdentity } from "./access";
import { mcpConfig, publicBookingEnabled } from "./config";
import { digest, secret, encrypt, decrypt, McpError, limit } from "./security";
import { publicBusiness } from "./public";
import { id } from "./read-tools";
import { mcpReviewSuppressesEffects } from "./rollout";

export const creationSchema = z.object({ operationKey: z.string().uuid(), locationId: id, serviceId: id, staffId: id.optional(),
  startTime: z.string().datetime({ offset: true }), selectedOptionAlternativeIds: z.array(id).max(50).default([]),
  customerName: z.string().trim().min(2).max(100), customerEmail: z.string().trim().email().max(255).toLowerCase(),
  customerPhone: z.string().trim().regex(/^\+?[0-9\s()-]{8,18}$/), customerAddress: z.string().trim().max(300).optional() }).strict();
export const mutationSchema = z.object({ operationKey: z.string().uuid(), appointmentId: id, locationId: id, startTime: z.string().datetime({ offset: true }).optional() }).strict();
export type OperationKind = "create" | "public_create" | "reschedule" | "cancel";
type Summary = { action: OperationKind; business: string; service: string; location: string; staffId?: string; staffName?: string; startTime: string; endTime: string; duration: number; price: number; currency: string; timezone: string; customerName?: string; reviewMode?: boolean };
type Payload = { receipt: string; request: Record<string, unknown>; summary: Summary; appointmentId?: string; updatedAt?: string; appointmentHash?: string; inputHash?: string; publicSlug?: string };
const appointmentHash = (appointment: object) => digest(JSON.stringify(appointment));

async function saveOperation(input: { key: string; kind: OperationKind; businessId: string; connectionId?: string; payload: Omit<Payload, "receipt"> }) {
  const requestKey = digest(`${input.connectionId ?? "public"}:${input.businessId}:${input.kind}:${input.key}`);
  const fingerprint = digest(JSON.stringify(input.payload));
  const previous = await prisma.mcpOperation.findUnique({ where: { requestKey } });
  if (previous) {
    if (!previous.encryptedPayload) throw new McpError("OPERATION_EXPIRED", 409);
    if (previous.snapshotHash !== fingerprint) throw new McpError("IDEMPOTENCY_PAYLOAD_CONFLICT", 409);
    return preparedResult(decrypt(previous.encryptedPayload) as Payload, previous.expiresAt);
  }
  const payload = { ...input.payload, receipt: secret() };
  const expiresAt = new Date(Date.now() + 600000);
  try {
    await prisma.mcpOperation.create({ data: { requestKey, tokenHash: digest(payload.receipt), connectionId: input.connectionId,
      businessId: input.businessId, kind: input.kind, encryptedPayload: encrypt(payload), snapshotHash: fingerprint, expiresAt } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const concurrent = await prisma.mcpOperation.findUniqueOrThrow({ where: { requestKey } });
      if (concurrent.snapshotHash !== fingerprint) throw new McpError("IDEMPOTENCY_PAYLOAD_CONFLICT", 409);
      return preparedResult(decrypt(concurrent.encryptedPayload) as Payload, concurrent.expiresAt);
    }
    throw error;
  }
  return preparedResult(payload, expiresAt);
}
function preparedResult(payload: Payload, expiresAt: Date) {
  return { receipt: payload.receipt, summary: payload.summary, expiresAt: expiresAt.toISOString(), requiresBrowserApproval: true,
    approvalUrl: `${mcpConfig().origin}/mcp/confirm/${payload.receipt}`, message: "Revisa y aprueba esta operación en Puragenda. Preparar no reserva el horario ni autoriza el cambio." };
}

export async function prepareCreation(args: z.infer<typeof creationSchema>, identity: McpIdentity | null, publicSlug?: string) {
  if (publicSlug && !publicBookingEnabled()) throw new McpError("PUBLIC_BOOKING_DISABLED");
  const context = publicSlug ? null : await authorizedContext(identity, "appointments:write", args.locationId);
  const business = publicSlug ? await publicBusiness(publicSlug) : context!.access.business;
  if (context) requireWrite(context, args.staffId);
  const inputHash = digest(JSON.stringify({ ...args, operationKey: undefined, startTime: new Date(args.startTime).toISOString(), selectedOptionAlternativeIds: [...args.selectedOptionAlternativeIds].sort() }));
  const requestKey = digest(`${context?.identity.connection.id ?? "public"}:${business.id}:${publicSlug ? "public_create" : "create"}:${args.operationKey}`);
  const previous = await prisma.mcpOperation.findUnique({ where: { requestKey } });
  if (previous) {
    if (!previous.encryptedPayload) throw new McpError("OPERATION_EXPIRED", 409);
    const { payload } = await loadOperation((decrypt(previous.encryptedPayload) as Payload).receipt);
    if (payload.inputHash !== inputHash) throw new McpError("IDEMPOTENCY_PAYLOAD_CONFLICT", 409);
    return preparedResult(payload, previous.expiresAt);
  }
  if (business.depositRequired) throw new McpError("DEPOSIT_BOOKING_UNAVAILABLE", 409);
  if (publicSlug) {
    await limit(`public-preparation:business:${business.id}`, 30, 3600000);
    await limit(`public-preparation:email:${business.id}:${args.customerEmail.trim().toLowerCase()}`, 5, 3600000);
    await limit(`public-preparation:phone:${business.id}:${args.customerPhone.replace(/\D/g, "")}`, 5, 3600000);
  }
  const current = await loadBookingContext(business.id);
  const location = current.locations.find((l) => l.id === args.locationId);
  if (!location) throw new McpError("LOCATION_FORBIDDEN");
  const availability = await getBookingAvailability(current, { date: formatInTimeZone(new Date(args.startTime), location.timezone, "yyyy-MM-dd"),
    serviceId: args.serviceId, locationId: args.locationId, staffId: args.staffId, selectedOptionAlternativeIds: args.selectedOptionAlternativeIds });
  const slot = availability.slots.find((s) => s.startTime === new Date(args.startTime).toISOString());
  if (!slot) throw new McpError("SLOT_CONFLICT", 409);
  const service = current.services.find((s) => s.id === args.serviceId)!;
  if (publicSlug && (availability.selection.price !== 0 || service.price !== 0 || service.depositAmount || service.optionCategories.some((category) => category.alternatives.some((a) => a.priceDelta > 0)))) throw new McpError("PAID_PUBLIC_BOOKING_UNAVAILABLE", 403);
  if (availability.selection.requiresAddress && (!args.customerAddress || args.customerAddress.length < 5)) throw new McpError("ADDRESS_REQUIRED", 400);
  const { operationKey, ...input } = args;
  const request = bookingSchema.parse({ ...input, startTime: slot.startTime, endTime: slot.endTime });
  const summary: Summary = { action: publicSlug ? "public_create" : "create", business: business.name, service: service.name,
    location: location.name, staffId: args.staffId, staffName: current.staff.find((s) => s.id === args.staffId)?.name, startTime: slot.startTime, endTime: slot.endTime,
    duration: availability.selection.duration, price: availability.selection.price, currency: business.currencyCode, timezone: location.timezone, customerName: args.customerName,
    ...(mcpReviewSuppressesEffects(business.id) ? { reviewMode: true } : {}) };
  return saveOperation({ key: operationKey, kind: summary.action, businessId: business.id, connectionId: context?.identity.connection.id,
    payload: { request, summary, inputHash, ...(publicSlug ? { publicSlug } : {}) } });
}

async function managedTarget(identity: McpIdentity | null, locationId: string, appointmentId: string) {
  const context = await authorizedContext(identity, "appointments:write", locationId);
  requireAgenda(context);
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, businessId: context.business.id,
    AND: [appointmentScope(context), { OR: [{ locationId }, ...(context.location!.isPrimary ? [{ locationId: null }] : [])] }] }, include: { service: true } });
  if (!appointment) throw new McpError("APPOINTMENT_NOT_FOUND", 404);
  requireWrite(context, appointment.staffId);
  if (!["PENDING", "CONFIRMED", "AWAITING_PAYMENT"].includes(appointment.status) || appointment.recurringBookingId || appointment.paymentStatus === "APPROVED"
    || appointment.giftCardPaidAmount > 0 || appointment.additionalServiceIds.length) throw new McpError("MANUAL_RESOLUTION_REQUIRED", 409);
  return { context, appointment };
}
export async function prepareMutation(kind: "cancel" | "reschedule", args: z.infer<typeof mutationSchema>, identity: McpIdentity | null) {
  const { context: c, appointment: a } = await managedTarget(identity, args.locationId, args.appointmentId);
  if (kind === "reschedule" && (!args.startTime || new Date(args.startTime) <= new Date())) throw new McpError("INVALID_START_TIME", 400);
  const start = kind === "reschedule" ? new Date(args.startTime!) : a.startTime;
  const duration = a.totalDuration ?? a.service.duration;
  const end = new Date(start.getTime() + duration * 60000);
  if (kind === "reschedule") await validateAppointmentReschedule(a, start, end, c.location!.id);
  const staff = a.staffId ? await prisma.staff.findFirst({ where: { id: a.staffId, businessId: c.business.id }, select: { name: true } }) : null;
  const summary: Summary = { action: kind, business: c.business.name, service: a.service.name, location: c.location!.name,
    staffId: a.staffId ?? undefined, staffName: staff?.name, startTime: start.toISOString(), endTime: end.toISOString(), duration,
    price: a.totalPrice ?? a.service.price, currency: c.business.currencyCode, timezone: c.location!.timezone, customerName: a.customerName,
    ...(mcpReviewSuppressesEffects(c.business.id) ? { reviewMode: true } : {}) };
  return saveOperation({ key: args.operationKey, kind, businessId: c.business.id, connectionId: c.identity.connection.id,
    payload: { request: { locationId: c.location!.id, startTime: start.toISOString(), endTime: end.toISOString() }, summary, appointmentId: a.id, updatedAt: a.updatedAt.toISOString(), appointmentHash: appointmentHash(a) } });
}

export async function loadOperation(receipt: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(receipt)) throw new McpError("INVALID_RECEIPT", 400);
  const operation = await prisma.mcpOperation.findUnique({ where: { tokenHash: digest(receipt) } });
  if (!operation) throw new McpError("OPERATION_NOT_FOUND", 404);
  if (!operation.encryptedPayload || operation.createdAt.getTime() + 86400000 <= Date.now()) throw new McpError("OPERATION_EXPIRED", 409);
  if (!["DONE", "EXECUTING"].includes(operation.state) && operation.expiresAt <= new Date()) throw new McpError("OPERATION_EXPIRED", 409);
  return { operation, payload: decrypt(operation.encryptedPayload) as Payload };
}
export async function executeOperation(receipt: string, kind: OperationKind, identity: McpIdentity | null) {
  const { operation: op, payload } = await loadOperation(receipt);
  if (op.kind !== kind || (kind !== "public_create" && op.connectionId !== identity?.connection.id)) throw new McpError("OPERATION_FORBIDDEN");
  if (kind === "public_create") {
    if (!publicBookingEnabled()) throw new McpError("PUBLIC_BOOKING_DISABLED");
    if ((await publicBusiness(payload.publicSlug!)).id !== op.businessId) throw new McpError("OPERATION_FORBIDDEN");
  } else {
    const c = await authorizedContext(identity, "appointments:write", String(payload.request.locationId));
    if (c.business.id !== op.businessId) throw new McpError("OPERATION_FORBIDDEN");
    requireWrite(c, payload.summary.staffId);
  }
  if (op.state === "DONE") return op.result;
  if (op.state === "EXECUTING" && op.expiresAt <= new Date()) {
    // Expiry may never authorize a fresh write. Recover only a durable booking
    // checkpoint that already contains an appointment, using its original key.
    const checkpoint = await prisma.bookingOperation.findUnique({ where: { businessId_keyHash: { businessId: op.businessId, keyHash: digest(`mcp-${op.id}`) } } });
    if (!checkpoint?.appointmentId || !checkpoint.response) throw new McpError("OPERATION_EXPIRED", 409);
    const value = checkpoint.response as Record<string, unknown>;
    const result = { id: checkpoint.appointmentId, status: value.status ?? null, booking: value.booking ?? null,
      httpStatus: checkpoint.completedAt ? checkpoint.httpStatus ?? 201 : 202, operationStatus: checkpoint.completedAt ? null : "RECOVERY_REQUIRED" };
    await prisma.mcpOperation.update({ where: { id: op.id }, data: { state: "DONE", result: result as Prisma.InputJsonValue } });
    return result;
  }
  if (!op.approvedAt || !["APPROVED", "EXECUTING"].includes(op.state)) throw new McpError("BROWSER_APPROVAL_REQUIRED", 409);
  if (kind === "create" || kind === "public_create") {
    const business = await prisma.business.findUniqueOrThrow({ where: { id: op.businessId }, select: { slug: true } });
    await prisma.mcpOperation.updateMany({ where: { id: op.id, state: "APPROVED" }, data: { state: "EXECUTING" } });
    const request = new NextRequest(`${mcpConfig().origin}/api/business/${encodeURIComponent(business.slug)}/book`, { method: "POST",
      headers: { "Content-Type": "application/json", "Puragenda-Booking-Version": "1", "Idempotency-Key": `mcp-${op.id}` }, body: JSON.stringify(payload.request) });
    const response = await bookingExpectedQuoteContext.run({ price: payload.summary.price, duration: payload.summary.duration, forbidDeposit: true, requirePublicParticipation: kind === "public_create" },
      () => bookingReviewContext.run(mcpReviewSuppressesEffects(op.businessId), () => executeBooking(request, { params: Promise.resolve({ slug: business.slug }) }, op.businessId)));
    const body = await response.json();
    const result = { id: body.id ?? null, status: body.status ?? null, booking: body.booking ?? null, operationStatus: body.operationStatus ?? null,
      code: body.code ?? null, httpStatus: response.status, ...(mcpReviewSuppressesEffects(op.businessId) ? { reviewMode: true, externalEffects: "suppressed_review" } : {}),
      message: response.status === 202 ? "Reserva creada; requiere revisión de efectos pendientes. No repitas con una clave nueva." : "El estado de booking refleja el resultado real; crear no significa pagar ni confirmar." };
    if (response.status >= 500 || body.code === "BOOKING_IN_PROGRESS") return { ...result, retryWithSameReceipt: true };
    await prisma.$transaction(async (db) => {
      await db.mcpOperation.update({ where: { id: op.id }, data: { state: "DONE", result } });
      await db.auditLog.create({ data: { action: "MCP_APPOINTMENT_CREATE", userId: identity?.connection.profile.userId ?? null, details: JSON.stringify({ businessId: op.businessId, operationId: op.id, appointmentId: body.id ?? null, httpStatus: response.status }) } });
    });
    return result;
  }
  const { context, appointment } = await managedTarget(identity, String(payload.request.locationId), payload.appointmentId!);
  const start = new Date(String(payload.request.startTime)), end = new Date(String(payload.request.endTime));
  if (kind === "reschedule") await validateAppointmentReschedule(appointment, start, end, context.location!.id);
  const result = await prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booking-capacity:${op.businessId}`}, 0))::text`;
    const currentOp = await db.mcpOperation.findUniqueOrThrow({ where: { id: op.id } });
    if (currentOp.state === "DONE") return { result: currentOp.result, executed: false };
    if (currentOp.expiresAt <= new Date()) throw new McpError("OPERATION_EXPIRED", 409);
    const current = await db.appointment.findFirst({ where: { id: payload.appointmentId, businessId: op.businessId }, include: { service: true } });
    if (!current || current.updatedAt.toISOString() !== payload.updatedAt || appointmentHash(current) !== payload.appointmentHash) throw new McpError("APPOINTMENT_CHANGED", 409);
    if (kind === "cancel") {
      const cancelled = await cancelAppointmentUnlessDepositApproved({ appointmentId: current.id, businessId: op.businessId, tx: db, expectedUpdatedAt: current.updatedAt,
        eligibility: { allowedStatuses: ["PENDING", "CONFIRMED", "AWAITING_PAYMENT"] }, extraData: { customerActionTokenHash: null, customerActionTokenExpiresAt: null, customerActionTokenUsedAt: new Date() } });
      if (!cancelled.ok) throw new McpError("MANUAL_RESOLUTION_REQUIRED", 409);
    } else {
      await rescheduleAppointmentWithinTransaction(db, current, start, end, context.location!.id);
    }
    const outcome = { id: current.id, status: kind === "cancel" ? "CANCELLED" : current.status, startTime: start.toISOString(), endTime: end.toISOString(),
      calendarSync: mcpReviewSuppressesEffects(op.businessId) ? "suppressed_review" : "pending",
      message: mcpReviewSuppressesEffects(op.businessId) ? "Cambio de prueba guardado en Puragenda sin correos ni sincronización de calendarios." : "Cambio guardado en Puragenda. La sincronización de calendario se verifica por separado." };
    await db.mcpOperation.update({ where: { id: op.id }, data: { state: "DONE", result: outcome } });
    await db.auditLog.create({ data: { userId: context.user.id, action: `MCP_APPOINTMENT_${kind.toUpperCase()}`, details: JSON.stringify({ businessId: op.businessId, operationId: op.id, appointmentId: current.id }) } });
    return { result: outcome, executed: true };
  });
  // The durable result is committed before any external effect; never repeat a
  // calendar mutation on replay or mistake provider failure for a failed change.
  if (!result.executed) return result.result;
  if (mcpReviewSuppressesEffects(op.businessId)) return result.result;
  try {
    const sync = await syncAppointmentToGoogle(payload.appointmentId!);
    if (sync.synced || sync.reason === "connection_not_found") {
      const outcome = { ...(result.result as object), calendarSync: sync.synced ? "synced" : "not_connected" };
      await prisma.mcpOperation.update({ where: { id: op.id }, data: { result: outcome } });
      return outcome;
    }
  } catch { /* Outcome remains explicit about pending sync. */ }
  return result.result;
}
