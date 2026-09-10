import type { BookingFeedbackRating, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { BOOKING_FEEDBACK_COMMENT_MAX_LENGTH } from "@/lib/booking-feedback/constants";

export type BookingFeedbackUpsertInput = {
  appointmentId: string;
  businessId: string;
  rating?: BookingFeedbackRating;
  comment?: string;
  googleReviewClicked?: boolean;
  clientPortalAccountId?: string | null;
  authenticated?: boolean;
  deviceType?: string | null;
  locale?: string | null;
};

export type BookingFeedbackAdminFilters = {
  since?: Date | null;
  rating?: BookingFeedbackRating | "ALL";
  google?: "ALL" | "CLICKED" | "NOT_CLICKED";
  businessQuery?: string;
};

const PAGE_SIZE = 20;

function normalizeComment(comment: string | undefined) {
  if (comment === undefined) return undefined;
  const trimmed = comment.trim().slice(0, BOOKING_FEEDBACK_COMMENT_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

export function deviceTypeFromUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("tablet") || ua.includes("ipad")) return "tablet";
  if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) return "mobile";
  if (ua.includes("mozilla") || ua.includes("chrome") || ua.includes("safari") || ua.includes("edg")) return "desktop";
  return "unknown";
}

export function computeBookingFeedbackMetrics(rows: Array<{
  rating: BookingFeedbackRating;
  comment: string | null;
  googleReviewClickedAt: Date | null;
}>) {
  const responses = rows.length;
  const positive = rows.filter((row) => row.rating === "POSITIVE").length;
  const comments = rows.filter((row) => Boolean(row.comment?.trim())).length;
  const googleClicks = rows.filter((row) => row.googleReviewClickedAt !== null).length;
  return {
    responses,
    positive,
    comments,
    googleClicks,
    positiveRate: responses === 0 ? 0 : (positive / responses) * 100,
    googleClickRate: responses === 0 ? 0 : (googleClicks / responses) * 100,
  };
}

export function formatFeedbackPercent(value: number) {
  return `${Math.round(value)}%`;
}

function adminWhere(filters: BookingFeedbackAdminFilters): Prisma.BookingFeedbackWhereInput {
  const where: Prisma.BookingFeedbackWhereInput = {};
  if (filters.since) where.createdAt = { gte: filters.since };
  if (filters.rating && filters.rating !== "ALL") where.rating = filters.rating;
  if (filters.google === "CLICKED") where.googleReviewClickedAt = { not: null };
  if (filters.google === "NOT_CLICKED") where.googleReviewClickedAt = null;
  const query = filters.businessQuery?.trim();
  if (query) {
    where.business = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } },
      ],
    };
  }
  return where;
}

export async function upsertBookingFeedback(input: BookingFeedbackUpsertInput) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, businessId: true },
  });

  if (!appointment || appointment.businessId !== input.businessId) {
    return { ok: false as const, error: "Cita no encontrada", status: 404 };
  }

  const existing = await prisma.bookingFeedback.findUnique({
    where: { appointmentId: appointment.id },
  });

  const comment = normalizeComment(input.comment);

  if (!existing) {
    if (!input.rating) {
      return { ok: false as const, error: "La valoración es obligatoria", status: 400 };
    }

    const created = await prisma.bookingFeedback.create({
      data: {
        appointmentId: appointment.id,
        businessId: appointment.businessId,
        rating: input.rating,
        comment: comment ?? null,
        googleReviewClickedAt: input.googleReviewClicked ? new Date() : null,
        clientPortalAccountId: input.clientPortalAccountId ?? null,
        authenticated: Boolean(input.authenticated),
        deviceType: input.deviceType ?? null,
        locale: input.locale ?? null,
      },
    });

    return { ok: true as const, feedback: created };
  }

  const updated = await prisma.bookingFeedback.update({
    where: { id: existing.id },
    data: {
      ...(input.rating ? { rating: input.rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
      ...(input.googleReviewClicked && !existing.googleReviewClickedAt
        ? { googleReviewClickedAt: new Date() }
        : {}),
      ...(input.locale ? { locale: input.locale } : {}),
    },
  });

  return { ok: true as const, feedback: updated };
}

export async function getBookingFeedbackAdminData(filters: BookingFeedbackAdminFilters & { page?: number }) {
  const where = adminWhere(filters);
  const page = Math.max(1, filters.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [total, positive, comments, googleClicks, items] = await Promise.all([
    prisma.bookingFeedback.count({ where }),
    prisma.bookingFeedback.count({ where: { ...where, rating: "POSITIVE" } }),
    prisma.bookingFeedback.count({ where: { ...where, comment: { not: null } } }),
    prisma.bookingFeedback.count({ where: { ...where, googleReviewClickedAt: { not: null } } }),
    prisma.bookingFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        comment: true,
        googleReviewClickedAt: true,
        authenticated: true,
        deviceType: true,
        locale: true,
        createdAt: true,
        appointmentId: true,
        business: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return {
    metrics: {
      responses: total,
      positive,
      comments,
      googleClicks,
      positiveRate: total === 0 ? 0 : (positive / total) * 100,
      googleClickRate: total === 0 ? 0 : (googleClicks / total) * 100,
    },
    total,
    page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items,
  };
}

export const BOOKING_FEEDBACK_PAGE_SIZE = PAGE_SIZE;
