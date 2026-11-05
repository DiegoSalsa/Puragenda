import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { hashClientPortalToken, normalizeClientPortalEmail } from "./client-portal.service";
import { dateOnlyInTimezone, generateAppointments, type SelectedTimes } from "./recurring.service";
import { resolveAppointmentVenue } from "./appointment-venue";
import { syncRecurringBookingAppointments } from "./google-calendar.service";
import { sendRecurringBookingCancelledClient } from "@/server/email/send";

export function portalPlanWhere(locator: string, email: string, now = new Date()): Prisma.RecurringBookingWhereInput {
  return {
    portalOwnerEmail: normalizeClientPortalEmail(email),
    OR: [
      { id: locator }, // A stable, non-secret locator for the authenticated portal.
      { AND: [
        { OR: [{ managementTokenHash: hashClientPortalToken(locator) }, { managementToken: locator, managementTokenHash: null }] },
        { managementTokenRevokedAt: null },
        { OR: [{ managementTokenExpiresAt: { gt: now } }, { managementTokenExpiresAt: null, endDate: { gt: new Date(now.getTime() - 30 * 86400000) } }] },
      ] },
    ],
  };
}

export async function managePortalPlan(locator: string, email: string, input: { action: string; pauseUntil?: string }) {
  const result = await prisma.$transaction(async tx => {
    const target = await tx.recurringBooking.findFirst({ where: portalPlanWhere(locator, email), select: { id: true } });
    if (!target) return { status: 404, error: "Plan no encontrado" };
    await tx.$queryRaw`SELECT id FROM "RecurringBooking" WHERE id=${target.id} FOR UPDATE`;
    const booking = await tx.recurringBooking.findFirst({ where: { id: target.id, AND: portalPlanWhere(locator, email) }, include: { service: { select: { duration: true } }, business: { select: { timezone: true } }, location: { select: { businessId: true, timezone: true } } } });
    if (!booking) return { status: 404, error: "Plan no encontrado" };
    const now = new Date();
    if (input.action === "rotate-link" || input.action === "revoke-link") {
      const token = crypto.randomBytes(32).toString("base64url");
      await tx.recurringBooking.update({ where: { id: booking.id }, data: input.action === "revoke-link" ? { managementTokenRevokedAt: now } : {
        managementToken: null, managementTokenHash: hashClientPortalToken(token), managementTokenRevokedAt: null, managementTokenExpiresAt: new Date(now.getTime() + 30 * 86400000),
      } });
      return { status: 200, id: booking.id, ...(input.action === "rotate-link" ? { url: `/mi-plan/${token}` } : {}) };
    }
    const timezone = (await resolveAppointmentVenue(booking)).timezone;
    const future: Prisma.AppointmentWhereInput = { recurringBookingId: booking.id, businessId: booking.businessId, startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED", "AWAITING_PAYMENT"] } };
    if (!["pause", "cancel", "resume"].includes(input.action)) return { status: 400, error: "Acción no válida" };
    if (input.action === "resume" ? booking.status !== "PAUSED" : !["ACTIVE", ...(input.action === "cancel" ? ["PAUSED"] : [])].includes(booking.status)) return { status: 409, error: "El estado del plan cambió; actualiza la página" };
    // Parent and appointment locks serialize actions with each other and deposits.
    await tx.$queryRaw`SELECT id FROM "Appointment" WHERE "recurringBookingId"=${booking.id} AND "startTime">=${now} FOR UPDATE`;
    if (await tx.appointment.findFirst({ where: { ...future, paymentStatus: "APPROVED" }, select: { id: true } })) return { status: 409, error: "El plan tiene citas con abono aprobado. Requiere resolución manual." };
    if (input.action === "resume") {
      const start = dateOnlyInTimezone(now, timezone);
      if (booking.endDate < start) return { status: 409, error: "El plan ya venció" };
      await generateAppointments({ recurringBookingId: booking.id, businessId: booking.businessId, locationId: booking.locationId, serviceId: booking.serviceId, staffId: booking.staffId, clientId: booking.clientId, customerName: booking.customerName, customerEmail: booking.portalOwnerEmail!, customerPhone: booking.customerPhone, customerAddress: booking.customerAddress, startDate: start, endDate: booking.endDate, selectedDays: booking.selectedDays, selectedTimes: booking.selectedTimes as SelectedTimes, serviceDurationMinutes: booking.service.duration, timezone, db: tx, syncGoogle: false });
      await tx.recurringBooking.update({ where: { id: booking.id }, data: { status: "ACTIVE", pausedUntil: null } });
    } else {
      const pause = input.pauseUntil ? new Date(input.pauseUntil) : null;
      if (input.action === "pause" && (!pause || !Number.isFinite(pause.getTime()) || pause <= now || pause > booking.endDate)) return { status: 400, error: "Fecha de pausa inválida" };
      await tx.appointment.updateMany({ where: { ...future, paymentStatus: { not: "APPROVED" } }, data: { status: "CANCELLED" } });
      await tx.recurringBooking.update({ where: { id: booking.id }, data: { status: input.action === "pause" ? "PAUSED" : "CANCELLED", pausedUntil: input.action === "pause" ? pause : null } });
    }
    return { status: 200, id: booking.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
  if (result.status === 200 && "id" in result && ["pause", "resume", "cancel"].includes(input.action)) {
    try { await syncRecurringBookingAppointments(result.id); } catch { console.error("[portal-plan] Calendar synchronization pending"); }
    if (input.action === "cancel") {
      const booking = await prisma.recurringBooking.findUnique({ where: { id: result.id }, select: { portalOwnerEmail: true, customerName: true, service: { select: { name: true } }, business: { select: { name: true } } } });
      if (booking?.portalOwnerEmail) {
        try { await sendRecurringBookingCancelledClient({ customerEmail: booking.portalOwnerEmail, customerName: booking.customerName, serviceName: booking.service.name, businessName: booking.business.name }); } catch { console.error("[portal-plan] Cancellation notification pending"); }
      }
    }
  }
  return result;
}
