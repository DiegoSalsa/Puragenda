import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));
vi.mock("@/server/services/subscription-payment-notification.service", () => ({
  notifySubscriptionPayment: mocks.notify,
}));

import { processPaddleWebhook } from "@/server/services/paddle-webhook.service";

const subscription = {
  id: "sub-1",
  plan: "EQUIPO",
  billingCycle: "MONTHLY",
  status: "INACTIVE",
  isTrial: false,
  business: {
    name: "Cinnamon nails",
    currencyCode: "USD",
    countryCode: "US",
    owner: { email: "owner@example.com", name: "Owner" },
  },
};

function transactionEvent(eventType: string, status = "completed") {
  return {
    eventType,
    eventId: `evt-${eventType}`,
    occurredAt: "2026-09-14T12:00:00Z",
    data: {
      id: "txn-1",
      status,
      subscriptionId: "paddle-sub-1",
      invoiceId: "inv-1",
      currencyCode: "USD",
      billedAt: "2026-09-14T11:59:00Z",
      updatedAt: "2026-09-14T11:59:00Z",
      billingPeriod: { startsAt: "2026-09-14T00:00:00Z", endsAt: "2026-10-14T00:00:00Z" },
      details: { totals: { grandTotal: "2900", total: "2900", currencyCode: "USD" } },
    },
  } as never;
}

describe("Paddle completed payment notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(subscription);
    mocks.update.mockResolvedValue({});
    mocks.notify.mockResolvedValue({ sent: true, skipped: false });
  });

  it("notifies once from transaction.completed with confirmed amount", async () => {
    await processPaddleWebhook(transactionEvent("transaction.completed"));

    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "sub-1" },
      data: expect.objectContaining({ status: "ACTIVE", isTrial: false }),
    }));
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({
      provider: "paddle",
      paymentId: "txn-1",
      amount: "2900",
      currency: "USD",
      amountIsMinorUnits: true,
      firstPayment: true,
    }));
  });

  it("ignores transaction.paid so an equivalent lifecycle event cannot duplicate", async () => {
    await processPaddleWebhook(transactionEvent("transaction.paid", "paid"));

    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("does not notify Chilean subscriptions handled by Mercado Pago", async () => {
    mocks.findFirst.mockResolvedValue({ ...subscription, business: { ...subscription.business, countryCode: "CL" } });

    await processPaddleWebhook(transactionEvent("transaction.completed"));

    expect(mocks.notify).not.toHaveBeenCalled();
  });
});
