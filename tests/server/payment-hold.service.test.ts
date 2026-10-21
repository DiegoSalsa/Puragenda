import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: { updateMany: mocks.updateMany },
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
  },
}));

import { paymentHoldExpiresAt, releaseExpiredPaymentHolds, PAYMENT_HOLD_DURATION_MS } from "@/server/services/payment-hold.service";

describe("payment holds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      appointment: { updateMany: mocks.updateMany },
      $queryRaw: mocks.queryRaw,
    }));
    mocks.updateMany.mockResolvedValue({ count: 2 });
    mocks.queryRaw.mockResolvedValue([]);
  });

  it("uses exactly ten minutes from the server creation instant", () => {
    const created = new Date("2026-10-20T12:00:00.000Z");
    expect(paymentHoldExpiresAt(created).toISOString()).toBe("2026-10-20T12:10:00.000Z");
    expect(PAYMENT_HOLD_DURATION_MS).toBe(600_000);
  });

  it("releases only pending, expiring holds under a business lock", async () => {
    const now = new Date("2026-10-20T12:10:00.000Z");
    await expect(releaseExpiredPaymentHolds({ businessId: "business-1", now })).resolves.toMatchObject({ released: 2, at: now });
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        businessId: { in: ["business-1"] },
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        paymentHoldExpiresAt: { lte: now },
        depositPaymentUrl: null,
        recurringBookingId: null,
      },
      data: { status: "CANCELLED" },
    });
  });
});

