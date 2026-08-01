import { beforeEach, describe, expect, it, vi } from "vitest";

const invoiceSearch = vi.hoisted(() => vi.fn());

vi.mock("mercadopago", () => ({
  Invoice: class {
    search = invoiceSearch;
  },
  MercadoPagoConfig: class {},
}));

import {
  calculateGracePeriodEnd,
  getLatestMercadoPagoInvoice,
  hasDunningAccess,
  nextPaidPeriodEnd,
} from "@/server/services/subscription-dunning.service";

describe("subscription dunning", () => {
  beforeEach(() => {
    invoiceSearch.mockReset();
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
});
