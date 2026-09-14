import { beforeEach, describe, expect, it, vi } from "vitest";

const invoiceSearch = vi.hoisted(() => vi.fn());
const preapprovalGet = vi.hoisted(() => vi.fn());
const subscriptionFindFirst = vi.hoisted(() => vi.fn());
const subscriptionUpdate = vi.hoisted(() => vi.fn());
const subscriptionUpdateMany = vi.hoisted(() => vi.fn());
const paymentFailedEmail = vi.hoisted(() => vi.fn());
const paymentRecoveredEmail = vi.hoisted(() => vi.fn());

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: {
      findFirst: subscriptionFindFirst,
      update: subscriptionUpdate,
      updateMany: subscriptionUpdateMany,
    },
  },
}));

vi.mock("@/server/services/affiliate.service", () => ({
  incrementPaidReferrals: vi.fn(),
}));

vi.mock("@/server/services/platform-discount.service", () => ({
  markPlatformDiscountApplied: vi.fn(),
}));

vi.mock("@/server/services/subscription-billing.service", () => ({
  advanceBillingBenefitAfterAuthorized: vi.fn(() =>
    Promise.resolve({ success: true })
  ),
}));

vi.mock("@/server/email/send", () => ({
  sendSubscriptionPaymentFailedEmail: paymentFailedEmail,
  sendSubscriptionPaymentRecoveredEmail: paymentRecoveredEmail,
}));

vi.mock("mercadopago", () => ({
  Invoice: class {
    search = invoiceSearch;
  },
  PreApproval: class {
    get = preapprovalGet;
  },
  MercadoPagoConfig: class {},
}));

import {
  calculateGracePeriodEnd,
  getMercadoPagoInvoiceByPaymentId,
  getLatestMercadoPagoInvoice,
  hasDunningAccess,
  nextPaidPeriodEnd,
  processMercadoPagoInvoice,
  reconcileMercadoPagoSubscription,
} from "@/server/services/subscription-dunning.service";

describe("subscription dunning", () => {
  beforeEach(() => {
    invoiceSearch.mockReset();
    preapprovalGet.mockReset();
    subscriptionFindFirst.mockReset();
    subscriptionUpdate.mockReset();
    subscriptionUpdateMany.mockReset();
    paymentFailedEmail.mockReset();
    paymentRecoveredEmail.mockReset();
    paymentFailedEmail.mockResolvedValue(true);
    paymentRecoveredEmail.mockResolvedValue(true);
  });

  it("grants 48 rolling hours after a failed attempt", () => {
    const attemptAt = new Date("2026-07-30T12:00:00.000Z");

    expect(calculateGracePeriodEnd(attemptAt).toISOString()).toBe(
      "2026-08-01T12:00:00.000Z"
    );
  });

  it("keeps access beyond a provider retry scheduled at the grace boundary", () => {
    const attemptAt = new Date("2026-07-30T12:00:00.000Z");
    const nextAttemptAt = new Date("2026-08-01T12:00:00.000Z");

    expect(
      calculateGracePeriodEnd(attemptAt, nextAttemptAt).toISOString()
    ).toBe("2026-08-01T18:00:00.000Z");
  });

  it("blocks only PAST_DUE subscriptions whose grace has expired", () => {
    const now = new Date("2026-08-02T12:00:00.000Z");

    expect(
      hasDunningAccess(
        {
          status: "PAST_DUE",
          gracePeriodEndsAt: new Date("2026-08-02T13:00:00.000Z"),
        },
        now
      )
    ).toBe(true);
    expect(
      hasDunningAccess(
        {
          status: "PAST_DUE",
          gracePeriodEndsAt: new Date("2026-08-02T11:00:00.000Z"),
        },
        now
      )
    ).toBe(false);
    expect(
      hasDunningAccess(
        { status: "ACTIVE", gracePeriodEndsAt: null },
        now
      )
    ).toBe(true);
  });

  it("calculates monthly and annual paid periods from the invoice debit date", () => {
    const debitDate = new Date("2026-07-29T18:45:24.106Z");

    expect(nextPaidPeriodEnd("MONTHLY", debitDate).toISOString()).toBe(
      "2026-08-29T18:45:24.106Z"
    );
    expect(nextPaidPeriodEnd("ANNUAL", debitDate).toISOString()).toBe(
      "2027-07-29T18:45:24.106Z"
    );
  });

  it("searches invoices without forcing an unsupported page limit", async () => {
    invoiceSearch.mockResolvedValue({
      results: [
        {
          id: "older",
          preapproval_id: "subscription-1",
          last_modified: "2026-07-29T12:00:00.000Z",
          payment: { status: "approved" },
        },
        {
          id: "newer",
          preapproval_id: "subscription-1",
          last_modified: "2026-07-30T12:00:00.000Z",
          payment: { status: "rejected" },
        },
      ],
    });

    const latest = await getLatestMercadoPagoInvoice("subscription-1");

    expect(invoiceSearch).toHaveBeenCalledWith({
      options: { preapproval_id: "subscription-1" },
    });
    expect(latest?.id).toBe("newer");
  });

  it("finds a subscription invoice by payment without sending a limit", async () => {
    invoiceSearch.mockResolvedValue({
      results: [
        {
          id: "invoice-1",
          preapproval_id: "subscription-1",
          payment: { id: "987654", status: "approved" },
        },
      ],
    });

    const invoice = await getMercadoPagoInvoiceByPaymentId(987654);

    expect(invoiceSearch).toHaveBeenCalledWith({
      options: { payment_id: 987654 },
    });
    expect(invoice?.id).toBe("invoice-1");
  });

  it("does not let an older rejection undo a recovered payment", async () => {
    subscriptionFindFirst.mockResolvedValue({
      id: "subscription-1",
      status: "ACTIVE",
      lastPaymentStatus: "approved",
      lastPaymentAttemptAt: new Date("2026-08-01T13:00:00.000Z"),
      business: { name: "Test", owner: null },
    });

    const result = await processMercadoPagoInvoice({
      id: "invoice-old",
      preapproval_id: "mp-subscription-1",
      last_modified: "2026-08-01T12:00:00.000Z",
      payment: { id: "123", status: "rejected" },
    });

    expect(result).toEqual({
      handled: false,
      reason: "stale_rejected_invoice",
    });
    expect(subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("restores a past-due subscription after a newer approved payment", async () => {
    subscriptionFindFirst.mockResolvedValue({
      id: "subscription-1",
      businessId: "business-1",
      billingCycle: "MONTHLY",
      status: "PAST_DUE",
      isTrial: false,
      currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
      paymentFailedAt: new Date("2026-08-01T12:00:00.000Z"),
      lastInvoiceId: "invoice-1",
      lastPaymentStatus: "rejected",
      activePrizeId: null,
      freeMonthsRemaining: 0,
      hasCountedAsPaidReferral: true,
      business: { name: "Test", owner: null },
    });
    subscriptionUpdateMany.mockResolvedValue({ count: 1 });

    const result = await processMercadoPagoInvoice({
      id: "invoice-1",
      preapproval_id: "mp-subscription-1",
      debit_date: "2026-08-01T12:00:00.000Z",
      last_modified: "2026-08-01T13:00:00.000Z",
      payment: {
        id: "456",
        status: "approved",
        status_detail: "accredited",
      },
    });

    expect(result).toMatchObject({ handled: true, state: "ACTIVE" });
    expect(subscriptionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "subscription-1", status: "PAST_DUE" }),
        data: expect.objectContaining({
          status: "ACTIVE",
          paymentFailedAt: null,
          gracePeriodEndsAt: null,
          lastPaymentStatus: "approved",
        }),
      })
    );
  });

  it("does not let a stale rejection overwrite a recovery committed after its read", async () => {
    subscriptionFindFirst.mockResolvedValue({
      id: "subscription-1",
      status: "PAST_DUE",
      paymentFailedAt: new Date("2026-08-01T12:00:00.000Z"),
      lastInvoiceId: "invoice-old",
      lastPaymentId: "123",
      lastPaymentStatus: "rejected",
      lastPaymentAttemptAt: new Date("2026-08-01T12:00:00.000Z"),
      paymentRetryCount: 0,
      dunningEmailSentAt: null,
      graceExpiryWarningSentAt: null,
      business: { name: "Test", owner: null },
    });
    // Simulates ACTIVE being committed between findFirst and the guarded write.
    subscriptionUpdateMany.mockResolvedValue({ count: 0 });

    const result = await processMercadoPagoInvoice({
      id: "invoice-old",
      preapproval_id: "mp-subscription-1",
      last_modified: "2026-08-01T12:30:00.000Z",
      payment: { id: "123", status: "rejected" },
    });

    expect(result).toEqual({ handled: false, reason: "stale_rejected_invoice" });
    expect(subscriptionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "subscription-1",
        OR: [
          { lastPaymentAttemptAt: null },
          { lastPaymentAttemptAt: { lt: new Date("2026-08-01T12:30:00.000Z") } },
          {
            lastPaymentAttemptAt: new Date("2026-08-01T12:30:00.000Z"),
            paymentRetryCount: { lt: 0 },
          },
        ],
      },
      data: expect.objectContaining({
        status: "PAST_DUE",
        lastPaymentAttemptAt: new Date("2026-08-01T12:30:00.000Z"),
      }),
    });
    expect(subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("uses an atomic claim before sending a failed-payment email", async () => {
    subscriptionFindFirst.mockResolvedValue({
      id: "subscription-1",
      status: "ACTIVE",
      paymentFailedAt: null,
      gracePeriodEndsAt: null,
      lastInvoiceId: null,
      lastPaymentId: null,
      lastPaymentStatus: "approved",
      lastPaymentAttemptAt: new Date("2026-08-01T12:00:00.000Z"),
      paymentRetryCount: 0,
      dunningEmailSentAt: null,
      graceExpiryWarningSentAt: null,
      business: { name: "Test", owner: { email: "owner@example.com", name: "Owner" } },
    });
    subscriptionUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await processMercadoPagoInvoice({
      id: "invoice-new",
      preapproval_id: "mp-subscription-1",
      last_modified: "2026-08-01T13:00:00.000Z",
      payment: { id: "789", status: "rejected" },
    });

    expect(paymentFailedEmail).not.toHaveBeenCalled();
  });

  it("sends a recovered-payment email only for the winning PAST_DUE transition", async () => {
    const stalePastDueRead = {
      id: "subscription-1",
      businessId: "business-1",
      billingCycle: "MONTHLY",
      status: "PAST_DUE",
      currentPeriodEnd: new Date("2026-08-01T12:00:00.000Z"),
      paymentFailedAt: new Date("2026-08-01T12:00:00.000Z"),
      lastInvoiceId: "invoice-1",
      lastPaymentStatus: "rejected",
      lastPaymentAttemptAt: new Date("2026-08-01T12:00:00.000Z"),
      activePrizeId: null,
      freeMonthsRemaining: 0,
      hasCountedAsPaidReferral: true,
      business: { name: "Test", owner: { email: "owner@example.com", name: "Owner" } },
    };
    subscriptionFindFirst.mockResolvedValue(stalePastDueRead);
    subscriptionUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const approved = {
      id: "invoice-1",
      preapproval_id: "mp-subscription-1",
      debit_date: "2026-08-01T12:00:00.000Z",
      last_modified: "2026-08-01T13:00:00.000Z",
      payment: { id: "456", status: "approved" },
    };

    const first = await processMercadoPagoInvoice(approved);
    const duplicate = await processMercadoPagoInvoice(approved);

    expect(first).toMatchObject({ handled: true, state: "ACTIVE" });
    expect(duplicate).toEqual({ handled: false, reason: "stale_or_duplicate_approved_invoice" });
    expect(paymentRecoveredEmail).toHaveBeenCalledTimes(1);
  });

  it("surfaces a credential mismatch when an invoice search is empty", async () => {
    invoiceSearch.mockResolvedValue({ results: [] });
    preapprovalGet.mockRejectedValue({
      status: 400,
      message: "the preapprovalId is not valid for callerId",
    });

    await expect(
      reconcileMercadoPagoSubscription("mp-subscription-1")
    ).rejects.toMatchObject({
      status: 400,
      message: "the preapprovalId is not valid for callerId",
    });
  });
});
