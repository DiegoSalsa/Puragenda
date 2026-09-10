import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  appointment: { findUnique: vi.fn() },
  bookingFeedback: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock("@/server/db/prisma", () => ({ prisma }));

import {
  computeBookingFeedbackMetrics,
  formatFeedbackPercent,
  upsertBookingFeedback,
} from "@/server/services/booking-feedback.service";

describe("booking feedback metrics", () => {
  it("computes positive experience and Google rates", () => {
    const metrics = computeBookingFeedbackMetrics([
      { rating: "POSITIVE", comment: "ok", googleReviewClickedAt: new Date() },
      { rating: "POSITIVE", comment: null, googleReviewClickedAt: null },
      { rating: "IMPROVE", comment: "  ", googleReviewClickedAt: new Date() },
      { rating: "IMPROVE", comment: "hard", googleReviewClickedAt: null },
    ]);
    expect(metrics).toEqual({
      responses: 4,
      positive: 2,
      comments: 2,
      googleClicks: 2,
      positiveRate: 50,
      googleClickRate: 50,
    });
  });

  it("returns 0% when there are no responses", () => {
    const metrics = computeBookingFeedbackMetrics([]);
    expect(metrics.positiveRate).toBe(0);
    expect(metrics.googleClickRate).toBe(0);
    expect(formatFeedbackPercent(metrics.positiveRate)).toBe("0%");
  });
});

describe("upsertBookingFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.appointment.findUnique.mockResolvedValue({ id: "appt-1", businessId: "biz-1" });
  });

  it("creates POSITIVE feedback", async () => {
    prisma.bookingFeedback.findUnique.mockResolvedValue(null);
    prisma.bookingFeedback.create.mockResolvedValue({ id: "fb-1", rating: "POSITIVE", comment: null });
    const result = await upsertBookingFeedback({ appointmentId: "appt-1", businessId: "biz-1", rating: "POSITIVE" });
    expect(result.ok).toBe(true);
    expect(prisma.bookingFeedback.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ appointmentId: "appt-1", businessId: "biz-1", rating: "POSITIVE" }),
    }));
  });

  it("creates IMPROVE feedback with an optional comment", async () => {
    prisma.bookingFeedback.findUnique.mockResolvedValue(null);
    prisma.bookingFeedback.create.mockResolvedValue({ id: "fb-1", rating: "IMPROVE", comment: "lento" });
    const result = await upsertBookingFeedback({
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: "IMPROVE",
      comment: "lento",
    });
    expect(result.ok).toBe(true);
    expect(prisma.bookingFeedback.create.mock.calls[0][0].data.comment).toBe("lento");
  });

  it("allows creating without a comment", async () => {
    prisma.bookingFeedback.findUnique.mockResolvedValue(null);
    prisma.bookingFeedback.create.mockResolvedValue({ id: "fb-1", rating: "POSITIVE", comment: null });
    await upsertBookingFeedback({ appointmentId: "appt-1", businessId: "biz-1", rating: "POSITIVE", comment: "   " });
    expect(prisma.bookingFeedback.create.mock.calls[0][0].data.comment).toBeNull();
  });

  it("requires a rating to create the first record", async () => {
    prisma.bookingFeedback.findUnique.mockResolvedValue(null);
    const result = await upsertBookingFeedback({ appointmentId: "appt-1", businessId: "biz-1", comment: "hola" });
    expect(result).toEqual({ ok: false, error: "La valoración es obligatoria", status: 400 });
  });

  it("rejects an appointment that does not exist", async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    const result = await upsertBookingFeedback({ appointmentId: "missing", businessId: "biz-1", rating: "POSITIVE" });
    expect(result).toEqual({ ok: false, error: "Cita no encontrada", status: 404 });
    expect(prisma.bookingFeedback.create).not.toHaveBeenCalled();
  });

  it("rejects a token/business mismatch for another appointment", async () => {
    prisma.appointment.findUnique.mockResolvedValue({ id: "appt-1", businessId: "other-biz" });
    const result = await upsertBookingFeedback({ appointmentId: "appt-1", businessId: "biz-1", rating: "POSITIVE" });
    expect(result.status).toBe(404);
    expect(prisma.bookingFeedback.create).not.toHaveBeenCalled();
  });

  it("updates the same appointment instead of creating a duplicate", async () => {
    prisma.bookingFeedback.findUnique.mockResolvedValue({
      id: "fb-1",
      rating: "POSITIVE",
      comment: null,
      googleReviewClickedAt: null,
    });
    prisma.bookingFeedback.update.mockResolvedValue({ id: "fb-1", rating: "IMPROVE" });
    const result = await upsertBookingFeedback({ appointmentId: "appt-1", businessId: "biz-1", rating: "IMPROVE" });
    expect(result.ok).toBe(true);
    expect(prisma.bookingFeedback.create).not.toHaveBeenCalled();
    expect(prisma.bookingFeedback.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "fb-1" },
      data: expect.objectContaining({ rating: "IMPROVE" }),
    }));
  });

  it("records the first Google click and ignores a duplicate click timestamp overwrite", async () => {
    const firstClick = new Date("2026-09-01T12:00:00.000Z");
    prisma.bookingFeedback.findUnique.mockResolvedValue({
      id: "fb-1",
      rating: "POSITIVE",
      comment: null,
      googleReviewClickedAt: firstClick,
    });
    prisma.bookingFeedback.update.mockResolvedValue({ id: "fb-1", googleReviewClickedAt: firstClick });
    await upsertBookingFeedback({ appointmentId: "appt-1", businessId: "biz-1", googleReviewClicked: true });
    expect(prisma.bookingFeedback.update.mock.calls[0][0].data.googleReviewClickedAt).toBeUndefined();
  });

  it("sets googleReviewClickedAt when it was empty", async () => {
    prisma.bookingFeedback.findUnique.mockResolvedValue({
      id: "fb-1",
      rating: "POSITIVE",
      comment: null,
      googleReviewClickedAt: null,
    });
    prisma.bookingFeedback.update.mockResolvedValue({ id: "fb-1" });
    await upsertBookingFeedback({ appointmentId: "appt-1", businessId: "biz-1", googleReviewClicked: true });
    expect(prisma.bookingFeedback.update.mock.calls[0][0].data.googleReviewClickedAt).toBeInstanceOf(Date);
  });
});
