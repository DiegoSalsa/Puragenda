import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscriptionPaymentNotification: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
      update: mocks.update,
    },
  },
}));

vi.mock("@/server/email/send", () => ({
  sendSubscriptionPaymentAdminNotification: mocks.send,
}));

import { notifySubscriptionPayment } from "@/server/services/subscription-payment-notification.service";

const input = {
  subscriptionId: "sub-1",
  provider: "mercadopago" as const,
  paymentId: "payment-1",
  invoiceId: "invoice-1",
  businessName: "Cinnamon nails",
  ownerName: "Ana",
  ownerEmail: "ana@example.com",
  plan: "EQUIPO",
  billingCycle: "Mensual",
  paymentAt: new Date("2026-09-14T12:00:00.000Z"),
  amount: 19990,
  currency: "CLP",
  paymentType: "Primer pago",
  firstPayment: true,
  fromTrial: true,
  recovery: false,
};

describe("subscription payment admin notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue(true);
    mocks.update.mockResolvedValue({});
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("sends once for a first confirmed payment and records SENT", async () => {
    mocks.create.mockResolvedValue({ id: "claim-1" });

    const result = await notifySubscriptionPayment(input);

    expect(result).toEqual({ sent: true, skipped: false });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send.mock.calls[0][0]).toMatchObject({
      businessName: "Cinnamon nails",
      firstPayment: true,
      fromTrial: true,
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "claim-1" },
      data: expect.objectContaining({ status: "SENT" }),
    });
  });

  it("skips a duplicate provider payment already marked SENT", async () => {
    mocks.create.mockRejectedValue({ code: "P2002" });
    mocks.findUnique.mockResolvedValue({ id: "claim-1", status: "SENT" });

    const result = await notifySubscriptionPayment(input);

    expect(result).toEqual({ sent: false, skipped: true });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("does not send twice when a concurrent duplicate sees PENDING", async () => {
    let release!: () => void;
    const deliveryBlocked = new Promise<void>((resolve) => { release = resolve; });
    mocks.create.mockResolvedValueOnce({ id: "claim-1" }).mockRejectedValueOnce({ code: "P2002" });
    mocks.findUnique.mockResolvedValue({ id: "claim-1", status: "PENDING" });
    mocks.send.mockImplementationOnce(async () => {
      await deliveryBlocked;
      return true;
    });

    const first = notifySubscriptionPayment(input);
    await Promise.resolve();
    const second = await notifySubscriptionPayment(input);
    release();
    await first;

    expect(second).toEqual({ sent: false, skipped: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });

  it("reclaims FAILED delivery for a later retry", async () => {
    mocks.create.mockRejectedValue({ code: "P2002" });
    mocks.findUnique.mockResolvedValue({ id: "claim-1", status: "FAILED" });
    mocks.send.mockResolvedValue(true);

    const result = await notifySubscriptionPayment(input);

    expect(result.sent).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "claim-1", status: "FAILED" },
      data: expect.objectContaining({ status: "PENDING" }),
    });
  });

  it("reclaims a stale PENDING lease left by an interrupted server", async () => {
    const staleClaimedAt = new Date(Date.now() - 16 * 60 * 1000);
    mocks.create.mockRejectedValue({ code: "P2002" });
    mocks.findUnique.mockResolvedValue({ id: "claim-1", status: "PENDING", claimedAt: staleClaimedAt });

    const result = await notifySubscriptionPayment(input);

    expect(result.sent).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "claim-1", status: "PENDING", claimedAt: staleClaimedAt },
      data: { claimedAt: expect.any(Date) },
    });
  });

  it("formats Paddle minor units as the actual currency amount", async () => {
    mocks.create.mockResolvedValue({ id: "claim-paddle" });

    await notifySubscriptionPayment({
      ...input,
      provider: "paddle",
      paymentId: "txn-1",
      amount: "2900",
      currency: "USD",
      amountIsMinorUnits: true,
    });

    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      amountLabel: expect.stringMatching(/29([,.]00)?/),
    }));
  });
});
