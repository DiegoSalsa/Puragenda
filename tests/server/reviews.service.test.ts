import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  appointment: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn() },
  appointmentReview: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  },
  business: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn(),
  $executeRaw: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({ prisma }));
vi.mock("@/server/lib/audit", () => ({ createAuditLog: vi.fn() }));

import {
  autoPublishPendingReviews,
  editBookingReview,
  publishReview,
  reportReview,
  submitBookingReview,
} from "@/server/services/reviews.service";

const appointment = {
  id: "appt-1",
  businessId: "biz-1",
  clientId: "client-1",
  customerName: "Camila Pérez",
  customerEmail: "camila@example.com",
  status: "COMPLETED",
  startTime: new Date("2026-09-10T15:00:00.000Z"),
  endTime: new Date("2026-09-10T16:00:00.000Z"),
  service: { name: "Manicure permanente" },
  staff: { name: "Ana" },
  client: { id: "client-1", name: "Camila Pérez", email: "camila@example.com" },
  business: { id: "biz-1", name: "Cinnamon Nails", slug: "cinnamon", deletedAt: null },
  verifiedReview: null,
};

describe("submitBookingReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
    prisma.appointment.findUnique.mockResolvedValue(appointment);
  });

  it("creates private feedback without publishing", async () => {
    prisma.appointmentReview.create.mockResolvedValue({
      id: "rev-1",
      visibility: "PRIVATE",
      status: "PENDING",
      rating: 5,
      verificationSource: "BOOKING_TOKEN",
      autoPublishAt: null,
    });
    const result = await submitBookingReview({
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: 5,
      visibility: "PRIVATE",
      verificationSource: "BOOKING_TOKEN",
    });
    expect(result.ok).toBe(true);
    expect(prisma.appointmentReview.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        visibility: "PRIVATE",
        status: "PENDING",
        autoPublishAt: null,
        publicReviewerName: "Camila P.",
      }),
    }));
  });

  it("creates a public review as pending, not published", async () => {
    prisma.appointmentReview.create.mockResolvedValue({
      id: "rev-1",
      visibility: "PUBLIC",
      status: "PENDING",
      rating: 4,
      verificationSource: "CLIENT_PORTAL",
      autoPublishAt: new Date(),
    });
    const result = await submitBookingReview({
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: 4,
      comment: "Excelente atención",
      visibility: "PUBLIC",
      verificationSource: "CLIENT_PORTAL",
    });
    expect(result.ok).toBe(true);
    const data = prisma.appointmentReview.create.mock.calls[0][0].data;
    expect(data.status).toBe("PENDING");
    expect(data.autoPublishAt).toBeInstanceOf(Date);
  });

  it("rejects a booking from another business", async () => {
    const result = await submitBookingReview({
      appointmentId: "appt-1",
      businessId: "other",
      rating: 5,
      visibility: "PRIVATE",
      verificationSource: "BOOKING_TOKEN",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("rejects cancelled and future appointments", async () => {
    prisma.appointment.findUnique.mockResolvedValue({ ...appointment, status: "CANCELLED" });
    const cancelled = await submitBookingReview({
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: 5,
      visibility: "PRIVATE",
      verificationSource: "BOOKING_TOKEN",
    });
    expect(cancelled.ok).toBe(false);

    prisma.appointment.findUnique.mockResolvedValue({
      ...appointment,
      status: "COMPLETED",
      endTime: new Date(Date.now() + 60_000),
    });
    const future = await submitBookingReview({
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: 5,
      visibility: "PRIVATE",
      verificationSource: "BOOKING_TOKEN",
    });
    expect(future.ok).toBe(false);
  });
});

describe("business review actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  });

  it("publishes a pending public review of the same business", async () => {
    prisma.appointmentReview.findFirst.mockResolvedValue({
      id: "rev-1",
      businessId: "biz-1",
      visibility: "PUBLIC",
      status: "PENDING",
      withdrawnAt: null,
      rating: 5,
      publishedAt: null,
    });
    prisma.appointmentReview.updateMany.mockResolvedValue({ count: 1 });
    prisma.appointmentReview.findUnique.mockResolvedValue({ id: "rev-1", status: "PUBLISHED" });
    const result = await publishReview({ reviewId: "rev-1", businessId: "biz-1", actorUserId: "user-1" });
    expect(result.ok).toBe(true);
  });

  it("does not publish a review from another business", async () => {
    prisma.appointmentReview.findFirst.mockResolvedValue(null);
    const result = await publishReview({ reviewId: "rev-1", businessId: "biz-2", actorUserId: "user-1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("reports a review and prevents auto-publish", async () => {
    prisma.appointmentReview.findFirst.mockResolvedValue({
      id: "rev-1",
      businessId: "biz-1",
      visibility: "PUBLIC",
      status: "PENDING",
      withdrawnAt: null,
      rating: 2,
    });
    prisma.appointmentReview.updateMany.mockResolvedValue({ count: 1 });
    prisma.appointmentReview.findUnique.mockResolvedValue({ id: "rev-1", status: "REPORTED" });
    const result = await reportReview({
      reviewId: "rev-1",
      businessId: "biz-1",
      actorUserId: "user-1",
      reason: "INSULTS",
    });
    expect(result.ok).toBe(true);
    expect(prisma.appointmentReview.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REPORTED", autoPublishAt: null }),
    }));
  });
});

describe("autoPublishPendingReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  });

  it("publishes due public pending reviews and is idempotent", async () => {
    prisma.appointmentReview.findMany.mockResolvedValue([{ id: "rev-1", businessId: "biz-1", rating: 5 }]);
    prisma.appointmentReview.updateMany.mockResolvedValue({ count: 1 });
    const first = await autoPublishPendingReviews(new Date("2026-09-16T00:00:00.000Z"));
    expect(first.published).toBe(1);

    prisma.appointmentReview.updateMany.mockResolvedValue({ count: 0 });
    const second = await autoPublishPendingReviews(new Date("2026-09-16T00:00:00.000Z"));
    expect(second.published).toBe(0);
  });

  it("does not publish reviews that are still waiting", async () => {
    prisma.appointmentReview.findMany.mockResolvedValue([]);
    const result = await autoPublishPendingReviews(new Date("2026-09-13T00:00:00.000Z"));
    expect(result.published).toBe(0);
    expect(prisma.appointmentReview.updateMany).not.toHaveBeenCalled();
  });
});

describe("editBookingReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  });

  it("returns a published public review to pending after a substantial edit", async () => {
    prisma.appointmentReview.findUnique.mockResolvedValue({
      id: "rev-1",
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: 5,
      comment: "ok",
      visibility: "PUBLIC",
      status: "PUBLISHED",
      publishedAt: new Date(),
      submittedAt: new Date(),
      withdrawnAt: null,
      autoPublishAt: null,
      appointment: { customerEmail: "camila@example.com", client: { email: "camila@example.com" } },
    });
    prisma.appointmentReview.update.mockResolvedValue({ id: "rev-1", status: "PENDING", visibility: "PUBLIC" });
    const result = await editBookingReview({
      reviewId: "rev-1",
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: 3,
      customerEmail: "camila@example.com",
    });
    expect(result.ok).toBe(true);
    expect(prisma.appointmentReview.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PENDING" }),
    }));
  });
});
