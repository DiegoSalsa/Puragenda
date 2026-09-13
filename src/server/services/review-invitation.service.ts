import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/lib/audit";
import { signReviewToken } from "@/server/security/review-token";
import { REVIEWABLE_APPOINTMENT_STATUSES, REVIEW_INVITE_COOLDOWN_MS, REVIEW_INVITE_DELAY_AFTER_END_MS, REVIEW_INVITE_MAX_PER_APPOINTMENT } from "@/lib/reviews/constants";
import { sendReviewInvitationEmail } from "@/server/email/send";

function appUrl() {
  return process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
}

function reviewUrl(appointmentId: string, businessId: string) {
  const token = signReviewToken({ appointmentId, businessId });
  return `${appUrl()}/valorar/${encodeURIComponent(token)}`;
}

export async function getReviewOpportunity(businessId: string, now = new Date()) {
  const endedBefore = new Date(now.getTime() - REVIEW_INVITE_DELAY_AFTER_END_MS);
  const [completed, pending] = await Promise.all([
    prisma.appointment.count({
      where: {
        businessId,
        status: { in: [...REVIEWABLE_APPOINTMENT_STATUSES] },
        endTime: { lte: endedBefore },
      },
    }),
    prisma.appointment.count({
      where: {
        businessId,
        status: { in: [...REVIEWABLE_APPOINTMENT_STATUSES] },
        endTime: { lte: endedBefore },
        verifiedReview: { is: null },
      },
    }),
  ]);
  return {
    completedRecently: completed,
    pendingReviews: pending,
    canRequest: pending > 0,
  };
}

function canInvite(appointment: { reviewInviteCount: number; reviewInviteSentAt: Date | null }, now: Date) {
  if (appointment.reviewInviteCount >= REVIEW_INVITE_MAX_PER_APPOINTMENT) return false;
  if (!appointment.reviewInviteSentAt) return true;
  return now.getTime() - appointment.reviewInviteSentAt.getTime() >= REVIEW_INVITE_COOLDOWN_MS;
}

async function sendInviteForAppointment(appointment: {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  startTime: Date;
  reviewInviteCount: number;
  business: { name: string; timezone: string; locale: string };
  service: { name: string };
}, actorUserId?: string) {
  const url = reviewUrl(appointment.id, appointment.businessId);
  const sent = await sendReviewInvitationEmail({
    customerEmail: appointment.customerEmail,
    customerName: appointment.customerName,
    businessName: appointment.business.name,
    serviceName: appointment.service.name,
    startTime: appointment.startTime,
    timezone: appointment.business.timezone,
    locale: appointment.business.locale,
    reviewUrl: url,
  });
  if (!sent) return false;

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      reviewInviteSentAt: new Date(),
      reviewInviteCount: { increment: 1 },
    },
  });
  await createAuditLog("REVIEW_INVITED", {
    appointmentId: appointment.id,
    businessId: appointment.businessId,
  }, actorUserId);
  return true;
}

export async function sendDueReviewInvitations(now = new Date()) {
  const endedBefore = new Date(now.getTime() - REVIEW_INVITE_DELAY_AFTER_END_MS);
  const candidates = await prisma.appointment.findMany({
    where: {
      status: { in: [...REVIEWABLE_APPOINTMENT_STATUSES] },
      endTime: { lte: endedBefore },
      verifiedReview: { is: null },
      reviewInviteCount: { lt: 1 },
    },
    include: {
      business: { select: { name: true, timezone: true, locale: true, deletedAt: true } },
      service: { select: { name: true } },
    },
    take: 100,
    orderBy: { endTime: "asc" },
  });

  let sent = 0;
  for (const appointment of candidates) {
    if (appointment.business.deletedAt) continue;
    if (!appointment.customerEmail) continue;
    const ok = await sendInviteForAppointment(appointment);
    if (ok) sent += 1;
  }
  return { scanned: candidates.length, sent };
}

export async function requestReviewInvites(input: {
  businessId: string;
  actorUserId: string;
  appointmentIds?: string[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const endedBefore = new Date(now.getTime() - REVIEW_INVITE_DELAY_AFTER_END_MS);
  const candidates = await prisma.appointment.findMany({
    where: {
      businessId: input.businessId,
      ...(input.appointmentIds?.length ? { id: { in: input.appointmentIds } } : {}),
      status: { in: [...REVIEWABLE_APPOINTMENT_STATUSES] },
      endTime: { lte: endedBefore },
      verifiedReview: { is: null },
    },
    include: {
      business: { select: { name: true, timezone: true, locale: true, deletedAt: true } },
      service: { select: { name: true } },
    },
    take: 50,
    orderBy: { endTime: "desc" },
  });

  let sent = 0;
  let skipped = 0;
  for (const appointment of candidates) {
    if (!canInvite(appointment, now)) {
      skipped += 1;
      continue;
    }
    const ok = await sendInviteForAppointment(appointment, input.actorUserId);
    if (ok) sent += 1;
    else skipped += 1;
  }

  return { ok: true as const, sent, skipped, scanned: candidates.length };
}
