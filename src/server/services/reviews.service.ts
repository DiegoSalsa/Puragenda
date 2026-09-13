import type { Prisma, ReviewModerationStatus, ReviewVisibility } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { createAuditLog } from "@/server/lib/audit";
import {
  REVIEW_AUTO_PUBLISH_DELAY_MS,
  REVIEW_COMMENT_MAX_LENGTH,
  REVIEW_DASHBOARD_PAGE_SIZE,
  REVIEW_EDIT_AFTER_PUBLISH_MS,
  REVIEW_PUBLIC_LIST_PAGE_SIZE,
  REVIEW_REPLY_MAX_LENGTH,
  REVIEW_REPORT_DETAILS_MAX_LENGTH,
  type ReviewReportReasonCode,
} from "@/lib/reviews/constants";
import {
  canCustomerReviewAppointment,
  isSubstantialReviewEdit,
  reviewEligibilityMessage,
  sanitizeReviewText,
} from "@/lib/reviews/eligibility";
import { formatPublicReviewerName } from "@/lib/reviews/public-name";
import {
  averageFromSum,
  buildPublicRatingStats,
  honestAverageDelta,
  isCountablePublicReview,
  positiveShare,
  PUBLIC_REVIEW_WHERE,
} from "@/lib/reviews/rating";

type Tx = Prisma.TransactionClient;

export type ReviewActionError = {
  ok: false;
  error: string;
  status: number;
};

const APPOINTMENT_REVIEW_INCLUDE = {
  service: { select: { name: true } },
  staff: { select: { name: true } },
  client: { select: { id: true, name: true, email: true } },
  business: { select: { id: true, name: true, slug: true, deletedAt: true } },
  verifiedReview: { select: { id: true } },
} as const;

function fail(error: string, status: number): ReviewActionError {
  return { ok: false, error, status };
}

function isUniqueConstraint(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function autoPublishAtFor(visibility: ReviewVisibility, now: Date) {
  if (visibility !== "PUBLIC") return null;
  return new Date(now.getTime() + REVIEW_AUTO_PUBLISH_DELAY_MS);
}

function initialStatus(visibility: ReviewVisibility): ReviewModerationStatus {
  return visibility === "PUBLIC" ? "PENDING" : "PENDING";
}

async function applyPublicCounterDelta(
  tx: Tx,
  businessId: string,
  deltaCount: number,
  deltaSum: number,
) {
  if (deltaCount === 0 && deltaSum === 0) return;
  await tx.$executeRaw`
    UPDATE "Business"
    SET
      "publicReviewCount" = GREATEST(0, "publicReviewCount" + ${deltaCount}),
      "publicReviewRatingSum" = GREATEST(0, "publicReviewRatingSum" + ${deltaSum})
    WHERE "id" = ${businessId}
  `;
}

function counterDelta(fromPublished: boolean, toPublished: boolean, fromRating: number, toRating: number) {
  if (!fromPublished && toPublished) return { count: 1, sum: toRating };
  if (fromPublished && !toPublished) return { count: -1, sum: -fromRating };
  if (fromPublished && toPublished && fromRating !== toRating) return { count: 0, sum: toRating - fromRating };
  return { count: 0, sum: 0 };
}

async function loadAppointment(appointmentId: string) {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: APPOINTMENT_REVIEW_INCLUDE,
  });
}

function matchesCustomerEmail(appointment: { customerEmail: string; client?: { email: string } | null }, email: string) {
  const expected = email.trim().toLowerCase();
  if (appointment.customerEmail.trim().toLowerCase() === expected) return true;
  return appointment.client?.email.trim().toLowerCase() === expected;
}

export async function getReviewFormContext(input: {
  appointmentId: string;
  businessId: string;
  email?: string | null;
}) {
  const appointment = await loadAppointment(input.appointmentId);
  const eligibility = canCustomerReviewAppointment(appointment, input.businessId);
  if (!appointment || !eligibility.ok) {
    return fail(reviewEligibilityMessage(eligibility.reason) || "No se puede valorar esta reserva.", 404);
  }
  if (input.email && !matchesCustomerEmail(appointment, input.email)) {
    return fail("No se puede valorar esta reserva.", 404);
  }

  return {
    ok: true as const,
    appointment: {
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      customerName: appointment.customerName,
      serviceName: appointment.service?.name ?? "Servicio",
      staffName: appointment.staff?.name ?? null,
      business: {
        id: appointment.business.id,
        name: appointment.business.name,
        slug: appointment.business.slug,
      },
    },
    existing: appointment.verifiedReview,
  };
}

export async function submitBookingReview(input: {
  appointmentId: string;
  businessId: string;
  rating: number;
  comment?: string | null;
  visibility: ReviewVisibility;
  verificationSource: "BOOKING_TOKEN" | "CLIENT_PORTAL";
  clientPortalAccountId?: string | null;
  customerEmail?: string | null;
  actorUserId?: string | null;
}) {
  const appointment = await loadAppointment(input.appointmentId);
  const eligibility = canCustomerReviewAppointment(appointment, input.businessId);
  if (!appointment || !eligibility.ok) {
    return fail(reviewEligibilityMessage(eligibility.reason) || "No se puede valorar esta reserva.", eligibility.reason === "already_reviewed" ? 409 : 404);
  }
  if (input.customerEmail && !matchesCustomerEmail(appointment, input.customerEmail)) {
    return fail("No se puede valorar esta reserva.", 404);
  }

  const now = new Date();
  const comment = sanitizeReviewText(input.comment, REVIEW_COMMENT_MAX_LENGTH);
  const publicReviewerName = formatPublicReviewerName(
    appointment.client?.name || appointment.customerName,
  );

  try {
    const created = await prisma.$transaction(async (tx) => {
      return tx.appointmentReview.create({
        data: {
          appointmentId: appointment.id,
          businessId: appointment.businessId,
          clientId: appointment.clientId,
          clientPortalAccountId: input.clientPortalAccountId ?? null,
          rating: input.rating,
          comment,
          visibility: input.visibility,
          status: initialStatus(input.visibility),
          submittedAt: now,
          autoPublishAt: autoPublishAtFor(input.visibility, now),
          publicReviewerName,
          serviceNameSnapshot: appointment.service?.name ?? null,
          staffNameSnapshot: appointment.staff?.name ?? null,
          verificationSource: input.verificationSource,
        },
      });
    });

    await createAuditLog("REVIEW_SUBMITTED", {
      reviewId: created.id,
      appointmentId: appointment.id,
      businessId: appointment.businessId,
      visibility: created.visibility,
      rating: created.rating,
      verificationSource: created.verificationSource,
    }, input.actorUserId ?? undefined);

    if (created.visibility === "PUBLIC") {
      await createAuditLog("REVIEW_PUBLICATION_REQUESTED", {
        reviewId: created.id,
        businessId: appointment.businessId,
        autoPublishAt: created.autoPublishAt,
      }, input.actorUserId ?? undefined);
    }

    return { ok: true as const, review: created };
  } catch (error) {
    if (isUniqueConstraint(error)) {
      return fail("Esta reserva ya tiene una valoración.", 409);
    }
    throw error;
  }
}

export async function editBookingReview(input: {
  reviewId: string;
  appointmentId: string;
  businessId: string;
  rating?: number;
  comment?: string | null;
  visibility?: ReviewVisibility;
  customerEmail?: string | null;
  actorUserId?: string | null;
  now?: Date;
}) {
  const review = await prisma.appointmentReview.findUnique({
    where: { id: input.reviewId },
    include: {
      appointment: { select: { customerEmail: true, client: { select: { email: true } } } },
    },
  });
  if (!review || review.appointmentId !== input.appointmentId || review.businessId !== input.businessId) {
    return fail("No encontramos esa opinión.", 404);
  }
  if (review.withdrawnAt || review.status === "REMOVED") {
    return fail("Esta opinión ya no se puede editar.", 409);
  }
  if (input.customerEmail && !matchesCustomerEmail(review.appointment, input.customerEmail)) {
    return fail("No encontramos esa opinión.", 404);
  }

  const now = input.now ?? new Date();
  if (review.status === "PUBLISHED") {
    const publishedAt = review.publishedAt ?? review.submittedAt;
    if (now.getTime() - publishedAt.getTime() > REVIEW_EDIT_AFTER_PUBLISH_MS) {
      return fail("El plazo para editar esta opinión ya venció.", 409);
    }
  }
  if (review.status === "REPORTED") {
    return fail("Esta opinión está en revisión y no se puede editar.", 409);
  }

  const nextRating = input.rating ?? review.rating;
  const nextComment = input.comment === undefined
    ? review.comment
    : sanitizeReviewText(input.comment, REVIEW_COMMENT_MAX_LENGTH);
  const nextVisibility = input.visibility ?? review.visibility;
  const substantial = isSubstantialReviewEdit({
    previousRating: review.rating,
    nextRating,
    previousComment: review.comment,
    nextComment,
  });

  let nextStatus = review.status;
  let nextPublishedAt = review.publishedAt;
  let nextAutoPublishAt = review.autoPublishAt;
  if (nextVisibility === "PRIVATE") {
    nextStatus = "PENDING";
    nextPublishedAt = null;
    nextAutoPublishAt = null;
  } else if (review.status === "PUBLISHED" && substantial) {
    nextStatus = "PENDING";
    nextPublishedAt = null;
    nextAutoPublishAt = autoPublishAtFor("PUBLIC", now);
  } else if (review.visibility === "PRIVATE" && nextVisibility === "PUBLIC") {
    nextStatus = "PENDING";
    nextPublishedAt = null;
    nextAutoPublishAt = autoPublishAtFor("PUBLIC", now);
  }

  const wasPublished = isCountablePublicReview(review);
  const willPublish = nextVisibility === "PUBLIC" && nextStatus === "PUBLISHED" && !review.withdrawnAt;

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointmentReview.update({
      where: { id: review.id },
      data: {
        rating: nextRating,
        comment: nextComment,
        visibility: nextVisibility,
        status: nextStatus,
        publishedAt: nextPublishedAt,
        autoPublishAt: nextAutoPublishAt,
        lastCustomerEditAt: now,
      },
    });
    const delta = counterDelta(wasPublished, willPublish, review.rating, nextRating);
    await applyPublicCounterDelta(tx, review.businessId, delta.count, delta.sum);
    return row;
  });

  await createAuditLog("REVIEW_EDITED", {
    reviewId: review.id,
    businessId: review.businessId,
    visibility: updated.visibility,
    status: updated.status,
    substantial,
  }, input.actorUserId ?? undefined);

  return { ok: true as const, review: updated };
}

export async function withdrawBookingReview(input: {
  reviewId: string;
  appointmentId: string;
  businessId: string;
  customerEmail?: string | null;
  actorUserId?: string | null;
}) {
  const review = await prisma.appointmentReview.findUnique({
    where: { id: input.reviewId },
    include: { appointment: { select: { customerEmail: true, client: { select: { email: true } } } } },
  });
  if (!review || review.appointmentId !== input.appointmentId || review.businessId !== input.businessId) {
    return fail("No encontramos esa opinión.", 404);
  }
  if (input.customerEmail && !matchesCustomerEmail(review.appointment, input.customerEmail)) {
    return fail("No encontramos esa opinión.", 404);
  }
  if (review.withdrawnAt) return { ok: true as const, review };

  const wasPublished = isCountablePublicReview(review);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointmentReview.update({
      where: { id: review.id },
      data: {
        withdrawnAt: new Date(),
        autoPublishAt: null,
      },
    });
    if (wasPublished) {
      await applyPublicCounterDelta(tx, review.businessId, -1, -review.rating);
    }
    return row;
  });

  await createAuditLog("REVIEW_WITHDRAWN", {
    reviewId: review.id,
    businessId: review.businessId,
  }, input.actorUserId ?? undefined);

  return { ok: true as const, review: updated };
}

export async function publishReview(input: {
  reviewId: string;
  businessId: string;
  actorUserId: string;
  reply?: string | null;
}) {
  const review = await prisma.appointmentReview.findFirst({
    where: { id: input.reviewId, businessId: input.businessId },
  });
  if (!review) return fail("No encontramos esa opinión.", 404);
  if (review.visibility !== "PUBLIC") return fail("El feedback privado no se publica en Puragenda.", 409);
  if (review.withdrawnAt || review.status === "REMOVED") return fail("Esta opinión ya no se puede publicar.", 409);
  if (review.status === "REPORTED") return fail("Esta opinión está en moderación y no se puede publicar.", 409);

  const now = new Date();
  const reply = sanitizeReviewText(input.reply, REVIEW_REPLY_MAX_LENGTH);
  const wasPublished = isCountablePublicReview(review);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointmentReview.updateMany({
      where: {
        id: review.id,
        businessId: input.businessId,
        visibility: "PUBLIC",
        status: { in: ["PENDING", "PUBLISHED"] },
        withdrawnAt: null,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: review.publishedAt ?? now,
        autoPublishAt: null,
        ...(reply
          ? {
              businessReply: reply,
              businessRepliedAt: now,
              businessRepliedByUserId: input.actorUserId,
            }
          : {}),
      },
    });
    if (row.count === 0) return null;
    if (!wasPublished) {
      await applyPublicCounterDelta(tx, review.businessId, 1, review.rating);
    }
    return tx.appointmentReview.findUnique({ where: { id: review.id } });
  });

  if (!updated) return fail("No se pudo publicar esta opinión.", 409);

  await createAuditLog("REVIEW_PUBLISHED", {
    reviewId: review.id,
    businessId: review.businessId,
    withReply: Boolean(reply),
  }, input.actorUserId);
  if (reply) {
    await createAuditLog("REVIEW_BUSINESS_REPLY_CREATED", {
      reviewId: review.id,
      businessId: review.businessId,
    }, input.actorUserId);
  }

  return { ok: true as const, review: updated };
}

export async function replyToReview(input: {
  reviewId: string;
  businessId: string;
  actorUserId: string;
  reply: string;
  publish?: boolean;
}) {
  const reply = sanitizeReviewText(input.reply, REVIEW_REPLY_MAX_LENGTH);
  if (!reply) return fail("Escribe una respuesta.", 400);

  const review = await prisma.appointmentReview.findFirst({
    where: { id: input.reviewId, businessId: input.businessId },
  });
  if (!review) return fail("No encontramos esa opinión.", 404);
  if (review.visibility !== "PUBLIC") return fail("Solo se puede responder una opinión pública.", 409);
  if (review.withdrawnAt || review.status === "REMOVED") return fail("Esta opinión ya no admite respuesta.", 409);
  if (review.status === "REPORTED") return fail("Esta opinión está en moderación.", 409);

  if (input.publish && review.status === "PENDING") {
    return publishReview({
      reviewId: review.id,
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      reply,
    });
  }

  if (review.status !== "PUBLISHED") {
    return fail("Publica la opinión para que la respuesta sea visible.", 409);
  }

  const now = new Date();
  const updated = await prisma.appointmentReview.update({
    where: { id: review.id },
    data: {
      businessReply: reply,
      businessRepliedAt: now,
      businessRepliedByUserId: input.actorUserId,
    },
  });

  await createAuditLog(review.businessReply ? "REVIEW_BUSINESS_REPLY_EDITED" : "REVIEW_BUSINESS_REPLY_CREATED", {
    reviewId: review.id,
    businessId: review.businessId,
  }, input.actorUserId);

  return { ok: true as const, review: updated };
}

export async function reportReview(input: {
  reviewId: string;
  businessId: string;
  actorUserId: string;
  reason: ReviewReportReasonCode;
  details?: string | null;
}) {
  const review = await prisma.appointmentReview.findFirst({
    where: { id: input.reviewId, businessId: input.businessId },
  });
  if (!review) return fail("No encontramos esa opinión.", 404);
  if (review.visibility !== "PUBLIC") return fail("El feedback privado no se reporta como reseña pública.", 409);
  if (review.withdrawnAt || review.status === "REMOVED") return fail("Esta opinión ya no está activa.", 409);

  const now = new Date();
  const details = sanitizeReviewText(input.details, REVIEW_REPORT_DETAILS_MAX_LENGTH);
  const wasPublished = isCountablePublicReview(review);

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointmentReview.updateMany({
      where: {
        id: review.id,
        businessId: input.businessId,
        visibility: "PUBLIC",
        status: { in: ["PENDING", "PUBLISHED"] },
        withdrawnAt: null,
      },
      data: {
        status: "REPORTED",
        autoPublishAt: null,
        reportReason: input.reason,
        reportDetails: details,
        reportedAt: now,
        reportedByUserId: input.actorUserId,
      },
    });
    if (row.count === 0) return null;
    if (wasPublished) {
      await applyPublicCounterDelta(tx, review.businessId, -1, -review.rating);
    }
    return tx.appointmentReview.findUnique({ where: { id: review.id } });
  });

  if (!updated) return fail("No se pudo reportar esta opinión.", 409);

  await createAuditLog("REVIEW_REPORTED", {
    reviewId: review.id,
    businessId: review.businessId,
    reason: input.reason,
  }, input.actorUserId);

  return { ok: true as const, review: updated };
}

export async function moderateReview(input: {
  reviewId: string;
  actorUserId: string;
  decision: "APPROVE" | "REMOVE" | "KEEP_PRIVATE";
  notes?: string | null;
}) {
  const review = await prisma.appointmentReview.findUnique({ where: { id: input.reviewId } });
  if (!review) return fail("No encontramos esa opinión.", 404);

  const now = new Date();
  const notes = sanitizeReviewText(input.notes, REVIEW_REPORT_DETAILS_MAX_LENGTH);
  const wasPublished = isCountablePublicReview(review);

  const next = (() => {
    if (input.decision === "APPROVE") {
      return {
        visibility: "PUBLIC" as const,
        status: "PUBLISHED" as const,
        publishedAt: review.publishedAt ?? now,
        autoPublishAt: null,
        moderationOutcome: "APPROVED" as const,
      };
    }
    if (input.decision === "KEEP_PRIVATE") {
      return {
        visibility: "PRIVATE" as const,
        status: "PENDING" as const,
        publishedAt: null,
        autoPublishAt: null,
        moderationOutcome: "KEPT_PRIVATE" as const,
      };
    }
    return {
      visibility: review.visibility,
      status: "REMOVED" as const,
      publishedAt: review.publishedAt,
      autoPublishAt: null,
      moderationOutcome: "REMOVED" as const,
    };
  })();

  const willPublish = isCountablePublicReview({
    visibility: next.visibility,
    status: next.status,
    withdrawnAt: review.withdrawnAt,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.appointmentReview.update({
      where: { id: review.id },
      data: {
        ...next,
        moderatedAt: now,
        moderatedByUserId: input.actorUserId,
        moderationNotes: notes,
      },
    });
    const delta = counterDelta(wasPublished, willPublish, review.rating, review.rating);
    await applyPublicCounterDelta(tx, review.businessId, delta.count, delta.sum);
    return row;
  });

  await createAuditLog("REVIEW_REPORT_RESOLVED", {
    reviewId: review.id,
    businessId: review.businessId,
    decision: input.decision,
    outcome: next.moderationOutcome,
  }, input.actorUserId);
  if (input.decision === "REMOVE") {
    await createAuditLog("REVIEW_REMOVED", { reviewId: review.id, businessId: review.businessId }, input.actorUserId);
  } else if (input.decision === "APPROVE") {
    await createAuditLog("REVIEW_PUBLISHED", { reviewId: review.id, businessId: review.businessId, source: "admin" }, input.actorUserId);
  }

  return { ok: true as const, review: updated };
}

export async function autoPublishPendingReviews(now = new Date()) {
  const due = await prisma.appointmentReview.findMany({
    where: {
      visibility: "PUBLIC",
      status: "PENDING",
      withdrawnAt: null,
      autoPublishAt: { lte: now },
    },
    select: { id: true, businessId: true, rating: true },
    take: 200,
  });

  let published = 0;
  for (const review of due) {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointmentReview.updateMany({
        where: {
          id: review.id,
          visibility: "PUBLIC",
          status: "PENDING",
          withdrawnAt: null,
          autoPublishAt: { lte: now },
        },
        data: {
          status: "PUBLISHED",
          publishedAt: now,
          autoPublishAt: null,
        },
      });
      if (updated.count === 0) return false;
      await applyPublicCounterDelta(tx, review.businessId, 1, review.rating);
      return true;
    });
    if (result) {
      published += 1;
      await createAuditLog("REVIEW_AUTO_PUBLISHED", {
        reviewId: review.id,
        businessId: review.businessId,
      });
    }
  }

  return { scanned: due.length, published };
}

export async function getBusinessRatingSummary(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { publicReviewCount: true, publicReviewRatingSum: true },
  });
  const groups = await prisma.appointmentReview.groupBy({
    by: ["rating"],
    where: { businessId, ...PUBLIC_REVIEW_WHERE },
    _count: { rating: true },
  });
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const group of groups) {
    if (group.rating >= 1 && group.rating <= 5) {
      distribution[group.rating as 1 | 2 | 3 | 4 | 5] = group._count.rating;
    }
  }
  return buildPublicRatingStats({
    count: business?.publicReviewCount ?? 0,
    sum: business?.publicReviewRatingSum ?? 0,
    distribution,
  });
}

export async function getBusinessRatingSummariesBySlug(slugs: string[]) {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (unique.length === 0) return new Map<string, { count: number; average: number | null }>();
  const rows = await prisma.business.findMany({
    where: { slug: { in: unique }, deletedAt: null },
    select: { slug: true, publicReviewCount: true, publicReviewRatingSum: true },
  });
  return new Map(
    rows.map((row) => [
      row.slug,
      {
        count: row.publicReviewCount,
        average: averageFromSum(row.publicReviewRatingSum, row.publicReviewCount),
      },
    ]),
  );
}

export async function listPublicReviews(businessId: string, page = 1) {
  const take = REVIEW_PUBLIC_LIST_PAGE_SIZE;
  const skip = Math.max(0, (page - 1) * take);
  const where = { businessId, ...PUBLIC_REVIEW_WHERE };
  const [total, items] = await Promise.all([
    prisma.appointmentReview.count({ where }),
    prisma.appointmentReview.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        rating: true,
        comment: true,
        publicReviewerName: true,
        serviceNameSnapshot: true,
        publishedAt: true,
        submittedAt: true,
        businessReply: true,
        businessRepliedAt: true,
      },
    }),
  ]);
  return { total, page, pageSize: take, items };
}

export type DashboardReviewFilter = "ALL" | "PENDING" | "PUBLISHED" | "PRIVATE" | "REPORTED";

function dashboardWhere(businessId: string, filter: DashboardReviewFilter, rating?: number): Prisma.AppointmentReviewWhereInput {
  const where: Prisma.AppointmentReviewWhereInput = { businessId, withdrawnAt: null };
  if (filter === "PENDING") where.AND = [{ visibility: "PUBLIC" }, { status: "PENDING" }];
  if (filter === "PUBLISHED") where.AND = [{ visibility: "PUBLIC" }, { status: "PUBLISHED" }];
  if (filter === "PRIVATE") where.visibility = "PRIVATE";
  if (filter === "REPORTED") where.status = "REPORTED";
  if (rating && rating >= 1 && rating <= 5) where.rating = rating;
  return where;
}

export async function getDashboardReputation(businessId: string, now = new Date()) {
  const periodEnd = now;
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    summary,
    privateCount,
    pendingCount,
    reportedCount,
    recentPublic,
    previousPublic,
    reportedRatings,
    rejectedReports,
  ] = await Promise.all([
    getBusinessRatingSummary(businessId),
    prisma.appointmentReview.count({ where: { businessId, visibility: "PRIVATE", withdrawnAt: null } }),
    prisma.appointmentReview.count({ where: { businessId, visibility: "PUBLIC", status: "PENDING", withdrawnAt: null } }),
    prisma.appointmentReview.count({ where: { businessId, status: "REPORTED", withdrawnAt: null } }),
    prisma.appointmentReview.findMany({
      where: { businessId, ...PUBLIC_REVIEW_WHERE, publishedAt: { gte: periodStart, lte: periodEnd } },
      select: { rating: true },
    }),
    prisma.appointmentReview.findMany({
      where: { businessId, ...PUBLIC_REVIEW_WHERE, publishedAt: { gte: previousStart, lt: periodStart } },
      select: { rating: true },
    }),
    prisma.appointmentReview.aggregate({
      where: { businessId, reportedAt: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.appointmentReview.count({
      where: { businessId, moderationOutcome: "APPROVED", reportedAt: { not: null } },
    }),
  ]);

  const recentSum = recentPublic.reduce((sum, row) => sum + row.rating, 0);
  const previousSum = previousPublic.reduce((sum, row) => sum + row.rating, 0);
  const received = await prisma.appointmentReview.count({ where: { businessId } });
  const reported = reportedRatings._count._all;

  return {
    summary,
    privateCount,
    pendingCount,
    reportedCount,
    positiveShare: positiveShare(summary.distribution[4], summary.distribution[5], summary.count),
    recentAverage: averageFromSum(recentSum, recentPublic.length),
    previousAverage: averageFromSum(previousSum, previousPublic.length),
    averageDelta: honestAverageDelta(
      averageFromSum(recentSum, recentPublic.length),
      averageFromSum(previousSum, previousPublic.length),
      previousPublic.length,
    ),
    abuse: {
      received,
      reported,
      reportedShare: received > 0 ? Math.round((reported / received) * 100) : 0,
      reportedAverage: reportedRatings._avg.rating,
      rejectedReports,
    },
  };
}

export async function listDashboardReviews(input: {
  businessId: string;
  filter?: DashboardReviewFilter;
  rating?: number;
  page?: number;
}) {
  const filter = input.filter ?? "ALL";
  const page = Math.max(1, input.page ?? 1);
  const where = dashboardWhere(input.businessId, filter, input.rating);
  const skip = (page - 1) * REVIEW_DASHBOARD_PAGE_SIZE;
  const [total, items] = await Promise.all([
    prisma.appointmentReview.count({ where }),
    prisma.appointmentReview.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip,
      take: REVIEW_DASHBOARD_PAGE_SIZE,
      include: {
        appointment: {
          select: {
            id: true,
            startTime: true,
            customerName: true,
            service: { select: { name: true } },
            staff: { select: { name: true } },
          },
        },
      },
    }),
  ]);
  return {
    total,
    page,
    pageSize: REVIEW_DASHBOARD_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / REVIEW_DASHBOARD_PAGE_SIZE)),
    items,
  };
}

export async function listAdminReportedReviews(page = 1) {
  const take = REVIEW_DASHBOARD_PAGE_SIZE;
  const skip = (Math.max(1, page) - 1) * take;
  const where = { status: "REPORTED" as const, withdrawnAt: null };
  const [total, items] = await Promise.all([
    prisma.appointmentReview.count({ where }),
    prisma.appointmentReview.findMany({
      where,
      orderBy: { reportedAt: "asc" },
      skip,
      take,
      include: {
        business: { select: { id: true, name: true, slug: true } },
        appointment: {
          select: {
            id: true,
            startTime: true,
            service: { select: { name: true } },
          },
        },
        reportedByUser: { select: { name: true, email: true } },
      },
    }),
  ]);
  return {
    total,
    page: Math.max(1, page),
    pageSize: take,
    pageCount: Math.max(1, Math.ceil(total / take)),
    items,
  };
}

export async function getPublicBusinessProfile(slug: string) {
  const business = await prisma.business.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      address: true,
      publicReviewCount: true,
      publicReviewRatingSum: true,
      marketplaceListings: {
        where: {
          status: "ACTIVE",
          publishedAt: { not: null },
          authorizationConfirmedAt: { not: null },
          authorizationRevokedAt: null,
          locality: { isActive: true },
          location: { isActive: true },
        },
        select: {
          locality: { select: { name: true } },
          location: { select: { slug: true, name: true } },
          categories: {
            select: { category: { select: { name: true, isActive: true } } },
          },
        },
        take: 8,
      },
    },
  });
  if (!business) return null;
  const [summary, reviews] = await Promise.all([
    getBusinessRatingSummary(business.id),
    listPublicReviews(business.id, 1),
  ]);
  return { business, summary, reviews };
}
