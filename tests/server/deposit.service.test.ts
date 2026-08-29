import { beforeEach, describe, expect, it, vi } from "vitest";

type AppointmentRow = {
  id: string;
  businessId: string;
  status: string;
  paymentStatus: string;
  mpPaymentId: string | null;
  depositAmount: number | null;
  mpPreferenceId: string | null;
};

type UpdateManyArgs = {
  where: {
    id?: { in: string[] } | string;
    businessId?: string;
    paymentStatus?: string | { not: string };
    status?: string | { not: string };
  };
  data: Record<string, unknown>;
};

const rows = new Map<string, AppointmentRow>();
type DeliveryRow = {
  id: string;
  appointmentId: string;
  paymentId: string;
  ownerEmailDeliveredAt: Date | null;
  staffEmailDeliveredAt: Date | null;
  customerEmailDeliveredAt: Date | null;
  calendarSyncedAt: Date | null;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: Date;
  lockedUntil: Date | null;
};
const deliveries = new Map<string, DeliveryRow>();
const updateGate = { current: Promise.resolve() };

function matches(row: AppointmentRow, where: UpdateManyArgs["where"]) {
  const ids = typeof where.id === "string"
    ? [where.id]
    : where.id?.in;
  if (ids && !ids.includes(row.id)) return false;
  if (where.businessId && row.businessId !== where.businessId) return false;
  if (typeof where.paymentStatus === "string" && row.paymentStatus !== where.paymentStatus) return false;
  if (where.paymentStatus && typeof where.paymentStatus === "object" && row.paymentStatus === where.paymentStatus.not) return false;
  if (typeof where.status === "string" && row.status !== where.status) return false;
  if (where.status && typeof where.status === "object" && row.status === where.status.not) return false;
  return true;
}

async function updateManyAndReturn(args: UpdateManyArgs) {
  await updateGate.current;
  const updated: AppointmentRow[] = [];
  for (const row of rows.values()) {
    if (!matches(row, args.where)) continue;
    Object.assign(row, args.data);
    updated.push({ ...row });
  }
  return updated;
}

async function updateMany(args: UpdateManyArgs) {
  const updated = await updateManyAndReturn(args);
  return { count: updated.length };
}

async function createDeliveries({ data }: { data: Array<{ appointmentId: string; paymentId: string }> }) {
  for (const item of data) {
    if ([...deliveries.values()].some((delivery) => delivery.appointmentId === item.appointmentId)) continue;
    deliveries.set(`delivery-${item.appointmentId}`, {
      id: `delivery-${item.appointmentId}`,
      appointmentId: item.appointmentId,
      paymentId: item.paymentId,
      ownerEmailDeliveredAt: null,
      staffEmailDeliveredAt: null,
      customerEmailDeliveredAt: null,
      calendarSyncedAt: null,
      attempts: 0,
      lastError: null,
      nextAttemptAt: new Date(),
      lockedUntil: null,
    });
  }
  return { count: data.length };
}

function deliveryMatches(delivery: DeliveryRow, where: Record<string, unknown>): boolean {
  if (typeof where.id === "string" && delivery.id !== where.id) return false;
  const appointmentId = where.appointmentId as { in?: string[] } | undefined;
  if (appointmentId?.in && !appointmentId.in.includes(delivery.appointmentId)) return false;
  const nextAttemptAt = where.nextAttemptAt as { lte?: Date } | undefined;
  if (nextAttemptAt?.lte && delivery.nextAttemptAt > nextAttemptAt.lte) return false;
  const lockedUntil = where.lockedUntil as { lte?: Date } | null | undefined;
  if (lockedUntil === null && delivery.lockedUntil !== null) return false;
  if (lockedUntil?.lte && (!delivery.lockedUntil || delivery.lockedUntil > lockedUntil.lte)) return false;
  const and = where.AND as Record<string, unknown>[] | undefined;
  if (and && !and.every((condition) => deliveryMatches(delivery, condition))) return false;
  const or = where.OR as Record<string, unknown>[] | undefined;
  if (or && !or.some((condition) => deliveryMatches(delivery, condition))) return false;
  return true;
}

async function findDeliveryRows({ where }: { where: Record<string, unknown> }) {
  return [...deliveries.values()]
    .filter((delivery) => deliveryMatches(delivery, where))
    .filter((delivery) => (
      !delivery.ownerEmailDeliveredAt
      || !delivery.staffEmailDeliveredAt
      || !delivery.customerEmailDeliveredAt
      || !delivery.calendarSyncedAt
    ))
    .map((delivery) => ({ ...delivery, appointment: findUniqueImpl({ where: { id: delivery.appointmentId } }) }));
}

function applyDeliveryData(delivery: DeliveryRow, data: Record<string, unknown>) {
  if (data.ownerEmailDeliveredAt instanceof Date) delivery.ownerEmailDeliveredAt = data.ownerEmailDeliveredAt;
  if (data.staffEmailDeliveredAt instanceof Date) delivery.staffEmailDeliveredAt = data.staffEmailDeliveredAt;
  if (data.customerEmailDeliveredAt instanceof Date) delivery.customerEmailDeliveredAt = data.customerEmailDeliveredAt;
  if (data.calendarSyncedAt instanceof Date) delivery.calendarSyncedAt = data.calendarSyncedAt;
  if (typeof data.lastError === "string" || data.lastError === null) delivery.lastError = data.lastError as string | null;
  if (data.nextAttemptAt instanceof Date) delivery.nextAttemptAt = data.nextAttemptAt;
  if (data.lockedUntil instanceof Date || data.lockedUntil === null) delivery.lockedUntil = data.lockedUntil as Date | null;
  const attempts = data.attempts as { increment?: number } | undefined;
  if (attempts?.increment) delivery.attempts += attempts.increment;
}

async function updateManyDeliveries({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
  const matching = [...deliveries.values()].filter((delivery) => deliveryMatches(delivery, where));
  matching.forEach((delivery) => applyDeliveryData(delivery, data));
  return { count: matching.length };
}

async function updateDelivery({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
  const delivery = deliveries.get(where.id);
  if (!delivery) throw new Error("Delivery not found");
  applyDeliveryData(delivery, data);
  return { ...delivery };
}

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({
      appointment: { updateManyAndReturn, updateMany, findFirst: findFirstImpl, findUnique: findUniqueImpl, findMany: findManyImpl },
      depositPaymentDelivery: { createMany: createDeliveries },
    })),
    appointment: {
      updateManyAndReturn: vi.fn(updateManyAndReturn),
      updateMany: vi.fn(updateMany),
      findUnique: vi.fn(findUniqueImpl),
      findFirst: vi.fn(findFirstImpl),
      findMany: vi.fn(findManyImpl),
    },
    depositPaymentDelivery: {
      createMany: vi.fn(createDeliveries),
      findMany: vi.fn(findDeliveryRows),
      updateMany: vi.fn(updateManyDeliveries),
      update: vi.fn(updateDelivery),
    },
  },
}));

vi.mock("@/server/email/send", () => ({
  sendDepositConfirmedNotifications: vi.fn(),
}));

vi.mock("@/server/services/google-calendar.service", () => ({
  syncAppointmentToGoogle: vi.fn(),
}));

vi.mock("@/server/lib/audit", () => ({
  createAuditLog: vi.fn(),
}));

import { prisma } from "@/server/db/prisma";
import { sendDepositConfirmedNotifications } from "@/server/email/send";
import { createAuditLog } from "@/server/lib/audit";
import { syncAppointmentToGoogle } from "@/server/services/google-calendar.service";
import {
  cancelAppointmentUnlessDepositApproved,
  confirmDepositPayment,
  processPendingDepositPaymentDeliveries,
  rejectDepositPayment,
} from "@/server/services/deposit.service";

function findUniqueImpl({ where }: { where: { id: string } }) {
  const row = rows.get(where.id);
  if (!row) return null;
  return {
    ...row,
    customerName: "Cliente",
    customerEmail: "cliente@example.test",
    customerPhone: null,
    customerAddress: null,
    startTime: new Date("2026-09-01T15:00:00.000Z"),
    endTime: new Date("2026-09-01T16:00:00.000Z"),
    service: { name: "Corte" },
    staff: { name: "Ana", email: "ana@example.test" },
    business: {
      name: "Salon",
      timezone: "America/Santiago",
      owner: { email: "owner@example.test", name: "Owner" },
    },
  };
}

function findFirstImpl({ where }: { where: { id: string; businessId: string } }) {
  const row = rows.get(where.id);
  if (!row || row.businessId !== where.businessId) return null;
  return { status: row.status, paymentStatus: row.paymentStatus };
}

function findManyImpl({ where }: { where: { businessId: string; mpPreferenceId: string } }) {
  return [...rows.values()]
    .filter((row) => row.businessId === where.businessId && row.mpPreferenceId === where.mpPreferenceId)
    .map((row) => ({ id: row.id, depositAmount: row.depositAmount }));
}

function seed(row: AppointmentRow) {
  rows.set(row.id, { ...row });
}

describe("confirmDepositPayment", () => {
  beforeEach(() => {
    rows.clear();
    deliveries.clear();
    updateGate.current = Promise.resolve();
    vi.mocked(sendDepositConfirmedNotifications).mockResolvedValue({
      ownerDelivered: true,
      staffDelivered: true,
      customerDelivered: true,
      failedRecipients: [],
    });
    vi.mocked(syncAppointmentToGoogle).mockResolvedValue({ synced: true, action: "created" } as never);
    vi.mocked(createAuditLog).mockResolvedValue(undefined as never);
  });

  it("confirms an approved deposit and runs side effects once", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const result = await confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "webhook",
    });

    expect(result).toEqual({
      alreadyProcessed: false,
      confirmedIds: ["apt-1"],
      auditedOnlyIds: [],
      shouldRunSideEffects: true,
      deliveryErrors: [],
    });
    expect(rows.get("apt-1")).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
      mpPaymentId: "pay-1",
    });
    expect(sendDepositConfirmedNotifications).toHaveBeenCalledOnce();
    expect(syncAppointmentToGoogle).toHaveBeenCalledOnce();
    expect(createAuditLog).not.toHaveBeenCalled();
  });

  it("treats a duplicate approved webhook as already processed", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
      mpPaymentId: "pay-1",
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const result = await confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "webhook",
    });

    expect(result.alreadyProcessed).toBe(true);
    expect(result.shouldRunSideEffects).toBe(false);
    expect(sendDepositConfirmedNotifications).not.toHaveBeenCalled();
    expect(syncAppointmentToGoogle).not.toHaveBeenCalled();
  });

  it("lets only one of two concurrent confirmations run side effects", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    let release = () => {};
    updateGate.current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "webhook",
    });
    const second = confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "return",
    });
    release();

    const [a, b] = await Promise.all([first, second]);
    const winners = [a, b].filter((result) => result.shouldRunSideEffects);
    expect(winners).toHaveLength(1);
    expect(sendDepositConfirmedNotifications).toHaveBeenCalledOnce();
    expect(syncAppointmentToGoogle).toHaveBeenCalledOnce();
  });

  it("records a late approved payment on a cancelled appointment without confirming it", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "CANCELLED",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const result = await confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-late",
      source: "webhook",
    });

    expect(result).toEqual({
      alreadyProcessed: false,
      confirmedIds: [],
      auditedOnlyIds: ["apt-1"],
      shouldRunSideEffects: false,
      deliveryErrors: [],
    });
    expect(rows.get("apt-1")).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "APPROVED",
      mpPaymentId: "pay-late",
    });
    expect(sendDepositConfirmedNotifications).not.toHaveBeenCalled();
    expect(syncAppointmentToGoogle).not.toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalledWith(
      "DEPOSIT_APPROVED_AFTER_CANCEL",
      expect.objectContaining({
        appointmentIds: ["apt-1"],
        businessId: "biz-1",
        paymentId: "pay-late",
        newStatus: "CANCELLED",
        newPaymentStatus: "APPROVED",
      }),
    );
  });

  it("updates every appointment in a preference group without leaving mixed payment statuses", async () => {
    seed({
      id: "apt-a",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 1500,
      mpPreferenceId: "pref-group",
    });
    seed({
      id: "apt-b",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 1000,
      mpPreferenceId: "pref-group",
    });

    const result = await confirmDepositPayment({
      appointmentIds: ["apt-a", "apt-b"],
      businessId: "biz-1",
      paymentId: "pay-group",
      source: "return",
    });

    expect(result.confirmedIds.sort()).toEqual(["apt-a", "apt-b"]);
    expect(rows.get("apt-a")?.paymentStatus).toBe("APPROVED");
    expect(rows.get("apt-b")?.paymentStatus).toBe("APPROVED");
    expect(sendDepositConfirmedNotifications).toHaveBeenCalledTimes(2);
  });

  it("ignores appointments from another business", async () => {
    seed({
      id: "apt-other",
      businessId: "biz-other",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const result = await confirmDepositPayment({
      appointmentIds: ["apt-other"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "webhook",
    });

    expect(result.alreadyProcessed).toBe(true);
    expect(rows.get("apt-other")?.paymentStatus).toBe("PENDING");
    expect(sendDepositConfirmedNotifications).not.toHaveBeenCalled();
  });

  it("keeps the persisted approval if Google Calendar fails afterwards", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });
    vi.mocked(syncAppointmentToGoogle).mockRejectedValueOnce(new Error("google down"));

    const result = await confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "webhook",
    });

    expect(result.shouldRunSideEffects).toBe(true);
    expect(rows.get("apt-1")?.paymentStatus).toBe("APPROVED");
    expect(rows.get("apt-1")?.status).toBe("CONFIRMED");
  });

  it("keeps the persisted approval if email fails afterwards", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });
    vi.mocked(sendDepositConfirmedNotifications).mockRejectedValueOnce(new Error("resend down"));

    const result = await confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "return",
    });

    expect(result.shouldRunSideEffects).toBe(true);
    expect(rows.get("apt-1")?.paymentStatus).toBe("APPROVED");
  });

  it("persists failed delivery work and retries it after the backoff", async () => {
    seed({
      id: "apt-retry",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });
    vi.mocked(sendDepositConfirmedNotifications)
      .mockResolvedValueOnce({
        ownerDelivered: true,
        staffDelivered: false,
        customerDelivered: true,
        failedRecipients: ["staff"],
      })
      .mockResolvedValueOnce({
        ownerDelivered: true,
        staffDelivered: true,
        customerDelivered: true,
        failedRecipients: [],
      });

    const firstConfirmation = await confirmDepositPayment({
      appointmentIds: ["apt-retry"],
      businessId: "biz-1",
      paymentId: "pay-retry",
      source: "webhook",
    });
    expect(firstConfirmation.deliveryErrors).toHaveLength(1);

    const pendingDelivery = [...deliveries.values()][0];
    expect(pendingDelivery).toMatchObject({
      appointmentId: "apt-retry",
      attempts: 1,
      ownerEmailDeliveredAt: expect.any(Date),
      staffEmailDeliveredAt: null,
      customerEmailDeliveredAt: expect.any(Date),
    });

    const retry = await confirmDepositPayment({
      appointmentIds: ["apt-retry"],
      businessId: "biz-1",
      paymentId: "pay-retry",
      source: "webhook",
    });

    expect(retry).toMatchObject({ alreadyProcessed: true, deliveryErrors: [] });
    expect([...deliveries.values()][0]?.staffEmailDeliveredAt).toBeInstanceOf(Date);
    expect(sendDepositConfirmedNotifications).toHaveBeenCalledTimes(2);
  });
});

describe("rejectDepositPayment", () => {
  beforeEach(() => {
    rows.clear();
  });

  it("marks a pending deposit as rejected without changing appointment status", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    await rejectDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-rej",
    });

    expect(rows.get("apt-1")).toMatchObject({
      status: "AWAITING_PAYMENT",
      paymentStatus: "REJECTED",
      mpPaymentId: "pay-rej",
    });
  });

  it("does not overwrite an already approved payment", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
      mpPaymentId: "pay-1",
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const result = await rejectDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-old",
    });

    expect(result.rejectedIds).toEqual([]);
    expect(rows.get("apt-1")?.paymentStatus).toBe("APPROVED");
    expect(rows.get("apt-1")?.mpPaymentId).toBe("pay-1");
  });
});

describe("cancelAppointmentUnlessDepositApproved", () => {
  beforeEach(() => {
    rows.clear();
  });

  it("cancels a normal confirmed appointment with paymentStatus NONE", async () => {
    seed({
      id: "apt-normal",
      businessId: "biz-1",
      status: "CONFIRMED",
      paymentStatus: "NONE",
      mpPaymentId: null,
      depositAmount: null,
      mpPreferenceId: null,
    });

    const result = await cancelAppointmentUnlessDepositApproved({
      appointmentId: "apt-normal",
      businessId: "biz-1",
    });

    expect(result).toEqual({ ok: true });
    expect(rows.get("apt-normal")).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "NONE",
    });
  });

  it("cancels an awaiting deposit appointment while leaving paymentStatus PENDING", async () => {
    seed({
      id: "apt-wait",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const result = await cancelAppointmentUnlessDepositApproved({
      appointmentId: "apt-wait",
      businessId: "biz-1",
    });

    expect(result).toEqual({ ok: true });
    expect(rows.get("apt-wait")).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "PENDING",
    });
  });

  it("rejects administrative cancellation after the deposit is approved", async () => {
    seed({
      id: "apt-paid",
      businessId: "biz-1",
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
      mpPaymentId: "pay-1",
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const result = await cancelAppointmentUnlessDepositApproved({
      appointmentId: "apt-paid",
      businessId: "biz-1",
    });

    expect(result).toEqual({
      ok: false,
      error: "No se puede cancelar una cita con abono aprobado. Requiere resolución manual.",
      code: "APPROVED",
    });
    expect(rows.get("apt-paid")?.status).toBe("CONFIRMED");
  });

  it("is idempotent when two cancellations run on the same pending deposit", async () => {
    seed({
      id: "apt-wait",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const [first, second] = await Promise.all([
      cancelAppointmentUnlessDepositApproved({ appointmentId: "apt-wait", businessId: "biz-1" }),
      cancelAppointmentUnlessDepositApproved({ appointmentId: "apt-wait", businessId: "biz-1" }),
    ]);

    expect([first, second].every((result) => result.ok)).toBe(true);
    expect(rows.get("apt-wait")?.status).toBe("CANCELLED");
    expect(rows.get("apt-wait")?.paymentStatus).toBe("PENDING");
  });

  it("lets a late payment remain CANCELLED + APPROVED after cancel wins", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    const cancelled = await cancelAppointmentUnlessDepositApproved({
      appointmentId: "apt-1",
      businessId: "biz-1",
    });
    const paid = await confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-late",
      source: "webhook",
    });

    expect(cancelled).toEqual({ ok: true });
    expect(paid.auditedOnlyIds).toEqual(["apt-1"]);
    expect(paid.shouldRunSideEffects).toBe(false);
    expect(rows.get("apt-1")).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "APPROVED",
    });
    expect(sendDepositConfirmedNotifications).not.toHaveBeenCalled();
  });

  it("does not let cancel overwrite a payment that already won", async () => {
    seed({
      id: "apt-1",
      businessId: "biz-1",
      status: "AWAITING_PAYMENT",
      paymentStatus: "PENDING",
      mpPaymentId: null,
      depositAmount: 5000,
      mpPreferenceId: "pref-1",
    });

    await confirmDepositPayment({
      appointmentIds: ["apt-1"],
      businessId: "biz-1",
      paymentId: "pay-1",
      source: "return",
    });
    const cancelled = await cancelAppointmentUnlessDepositApproved({
      appointmentId: "apt-1",
      businessId: "biz-1",
    });

    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.code).toBe("APPROVED");
    expect(rows.get("apt-1")).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "APPROVED",
    });
  });
});

describe("mocked Prisma concurrency caveat", () => {
  it("documents that this file does not exercise real PostgreSQL FOR UPDATE", () => {
    expect(prisma.$transaction).toBeDefined();
  });
});
