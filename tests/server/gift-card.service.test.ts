import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ $transaction: vi.fn(), giftCard: { findUnique: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() } }));
vi.mock("@/server/db/prisma", () => ({ prisma: db }));

import {
  claimGiftCard,
  commitGiftCardRedemptions,
  deriveGiftCardClaimToken,
  hashGiftCardClaimToken,
  issueGiftCardForPurchase,
  normalizeGiftCardCode,
  releaseGiftCardRedemptions,
  reserveGiftCardRedemption,
  snapshotGiftCardTemplate,
} from "@/server/services/gift-card.service";

describe("gift card service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates deterministic, unguessable claim tokens without storing plaintext", () => {
    const token = deriveGiftCardClaimToken("card-1", "purchase-1");
    expect(token).toHaveLength(43);
    expect(deriveGiftCardClaimToken("card-1", "purchase-1")).toBe(token);
    expect(hashGiftCardClaimToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashGiftCardClaimToken(token)).not.toContain(token);
  });

  it("normalizes claim codes", () => expect(normalizeGiftCardCode(" gc-abcd-2345 ")).toBe("GC-ABCD-2345"));

  it("captures an immutable template and service-price snapshot", () => {
    const snapshot = snapshotGiftCardTemplate({ name: "Pack", description: null, type: "SERVICE", salePrice: 29_990, faceValue: null, currencyCode: "CLP", designPreset: "classic", backgroundColor: "#ffffff", accentColor: "#000000", textColor: "#111111", imageUrl: null, shortMessage: null, services: [{ quantity: 3, service: { id: "s1", name: "Manicure", price: 15_000 } }] });
    expect(snapshot.services[0]).toEqual({ serviceId: "s1", serviceName: "Manicure", servicePrice: 15_000, quantity: 3 });
  });

  it("does not issue when purchase is unpaid", async () => {
    const client = { giftCard: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() }, giftCardPurchase: { findUnique: vi.fn().mockResolvedValue({ id: "p1", paymentStatus: "PENDING" }) } };
    await expect(issueGiftCardForPurchase("p1", client as never)).rejects.toThrow("todavía no está pagada");
  });

  it("returns the existing card for a duplicate webhook", async () => {
    const existing = { id: "c1", purchaseId: "p1" };
    const client = { giftCard: { findUnique: vi.fn().mockResolvedValue(existing) } };
    const result = await issueGiftCardForPurchase("p1", client as never);
    expect(result.created).toBe(false);
    expect(result.giftCard).toBe(existing);
  });

  it("issues balance cards with separate sale price and face value", async () => {
    const purchase = { id: "p1", businessId: "b1", templateId: "t1", paymentStatus: "PAID", templateSnapshot: { name: "50k", description: null, type: "BALANCE", salePrice: 45_000, faceValue: 50_000, currencyCode: "CLP", designPreset: "classic", backgroundColor: "#fff", accentColor: "#000", textColor: "#111", imageUrl: null, shortMessage: null, services: [] } };
    const create = vi.fn(async ({ data }) => ({ ...data }));
    const client = { giftCard: { findUnique: vi.fn().mockResolvedValue(null), create }, giftCardPurchase: { findUnique: vi.fn().mockResolvedValue(purchase) } };
    const result = await issueGiftCardForPurchase("p1", client as never);
    expect(result.created).toBe(true);
    expect(create.mock.calls[0][0].data).toMatchObject({ salePriceSnapshot: 45_000, faceValueSnapshot: 50_000, initialBalance: 50_000, remainingBalance: 50_000 });
  });

  it("claims a new card for exactly one account", async () => {
    let owner: string | null = null;
    const tx = { giftCard: { findUnique: vi.fn().mockResolvedValue({ id: "c1", status: "ACTIVE", claimedAt: null, claimedByAccountId: null }), updateMany: vi.fn(async ({ data }) => { if (owner) return { count: 0 }; owner = data.claimedByAccountId; return { count: 1 }; }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "c1" }) } };
    db.$transaction.mockImplementation(async (callback) => callback(tx));
    await expect(claimGiftCard({ accountId: "a1", code: "GC-ABCD-2345" })).resolves.toMatchObject({ id: "c1" });
    expect(owner).toBe("a1");
  });

  it("rejects an already claimed card", async () => {
    const tx = { giftCard: { findUnique: vi.fn().mockResolvedValue({ id: "c1", status: "ACTIVE", claimedAt: new Date(), claimedByAccountId: "a1" }) } };
    db.$transaction.mockImplementation(async (callback) => callback(tx));
    await expect(claimGiftCard({ accountId: "a2", code: "GC-ABCD-2345" })).rejects.toThrow("ya fue agregada");
  });

  it("prevents concurrent balance overspend with a conditional decrement", async () => {
    let balance = 30_000;
    const tx = {
      giftCard: { findFirst: vi.fn().mockResolvedValue({ id: "c1", type: "BALANCE", remainingBalance: 30_000, entitlements: [] }), updateMany: vi.fn(async ({ where, data }) => { if (balance < where.remainingBalance.gte) return { count: 0 }; balance -= data.remainingBalance.decrement; return { count: 1 }; }), update: vi.fn() },
      giftCardRedemption: { create: vi.fn().mockResolvedValue({ id: "r1" }) }, giftCardTransaction: { create: vi.fn() }, giftCardServiceEntitlement: { updateMany: vi.fn() },
    };
    const input = { giftCardId: "c1", accountId: "a1", businessId: "b1", amountCovered: 25_000, coveredServices: [], commitImmediately: true };
    const results = await Promise.allSettled([reserveGiftCardRedemption(tx as never, { ...input, appointmentId: "apt1" }), reserveGiftCardRedemption(tx as never, { ...input, appointmentId: "apt2" })]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(balance).toBe(5_000);
  });

  it("conditionally decrements service quantity and never goes negative", async () => {
    let quantity = 1;
    const tx = {
      giftCard: { findFirst: vi.fn().mockResolvedValue({ id: "c1", type: "SERVICE", remainingBalance: null, entitlements: [{ id: "e1", serviceId: "s1", quantityRemaining: 1, serviceNameSnapshot: "Lifting" }] }), update: vi.fn() },
      giftCardServiceEntitlement: { updateMany: vi.fn(async () => quantity > 0 ? (quantity -= 1, { count: 1 }) : { count: 0 }) },
      giftCardRedemption: { create: vi.fn().mockResolvedValue({ id: "r1" }) }, giftCardTransaction: { create: vi.fn() },
    };
    await reserveGiftCardRedemption(tx as never, { giftCardId: "c1", accountId: "a1", businessId: "b1", appointmentId: "apt1", amountCovered: 25_000, coveredServices: [{ serviceId: "s1", amountCovered: 25_000 }], commitImmediately: true });
    await expect(reserveGiftCardRedemption(tx as never, { giftCardId: "c1", accountId: "a1", businessId: "b1", appointmentId: "apt2", amountCovered: 25_000, coveredServices: [{ serviceId: "s1", amountCovered: 25_000 }], commitImmediately: true })).rejects.toThrow("otra reserva");
    expect(quantity).toBe(0);
  });

  it("issues an unclaimed card and an initial balance ledger entry", async () => {
    const purchase = {
      id: "p1", businessId: "b1", templateId: "t1", paymentStatus: "PAID",
      templateSnapshot: {
        name: "50k", description: null, type: "BALANCE", salePrice: 45_000,
        faceValue: 50_000, currencyCode: "CLP", designPreset: "classic",
        backgroundColor: "#fff", accentColor: "#000", textColor: "#111",
        imageUrl: null, shortMessage: null, services: [],
      },
    };
    const create = vi.fn(async ({ data }) => data);
    const client = {
      giftCard: { findUnique: vi.fn().mockResolvedValue(null), create },
      giftCardPurchase: { findUnique: vi.fn().mockResolvedValue(purchase) },
    };
    await issueGiftCardForPurchase("p1", client as never);
    expect(create.mock.calls[0][0].data).toMatchObject({
      initialBalance: 50_000,
      remainingBalance: 50_000,
      transactions: {
        create: { amount: 50_000, type: "ISSUED", reason: "Emisión de Gift Card" },
      },
    });
    expect(create.mock.calls[0][0].data.claimedByAccountId).toBeUndefined();
  });

  it("rejects an invalid claim code", async () => {
    const tx = { giftCard: { findUnique: vi.fn().mockResolvedValue(null) } };
    db.$transaction.mockImplementation(async (callback) => callback(tx));
    await expect(claimGiftCard({ accountId: "a1", code: "GC-NOT-FOUND" }))
      .rejects.toThrow("inválida");
  });

  it("rejects a void card claim", async () => {
    const tx = {
      giftCard: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c1", status: "VOIDED", claimedAt: null, claimedByAccountId: null,
        }),
      },
    };
    db.$transaction.mockImplementation(async (callback) => callback(tx));
    await expect(claimGiftCard({ accountId: "a1", code: "GC-VOID-2345" }))
      .rejects.toThrow("no disponible");
  });

  it("marks a fully consumed balance card as depleted", async () => {
    const update = vi.fn();
    const tx = {
      giftCard: {
        findFirst: vi.fn().mockResolvedValue({
          id: "c1", type: "BALANCE", remainingBalance: 25_000, entitlements: [],
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update,
      },
      giftCardRedemption: { create: vi.fn().mockResolvedValue({ id: "r1" }) },
      giftCardTransaction: { create: vi.fn() },
    };
    await reserveGiftCardRedemption(tx as never, {
      giftCardId: "c1", accountId: "a1", businessId: "b1",
      appointmentId: "apt1", amountCovered: 25_000,
      coveredServices: [], commitImmediately: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { status: "DEPLETED" },
    });
  });

  it("commits only reserved redemptions and is duplicate-safe", async () => {
    const updateMany = vi.fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const tx = { giftCardRedemption: { updateMany } };
    await commitGiftCardRedemptions(["apt1"], tx as never);
    await commitGiftCardRedemptions(["apt1"], tx as never);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { appointmentId: { in: ["apt1"] }, status: "RESERVED" },
      data: { status: "COMMITTED", committedAt: expect.any(Date) },
    });
  });

  it("releases a balance reservation and restores its ledger once", async () => {
    const redemption = {
      id: "r1", appointmentId: "apt1", giftCardId: "c1",
      amountCovered: 10_000, status: "RESERVED",
      giftCard: { type: "BALANCE" }, items: [],
    };
    const findMany = vi.fn()
      .mockResolvedValueOnce([redemption])
      .mockResolvedValueOnce([]);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const cardUpdate = vi.fn();
    const ledgerCreate = vi.fn();
    const tx = {
      giftCardRedemption: { findMany, updateMany },
      giftCard: { update: cardUpdate },
      giftCardTransaction: { create: ledgerCreate },
      giftCardServiceEntitlement: { update: vi.fn() },
    };
    await releaseGiftCardRedemptions({
      appointmentIds: ["apt1"], reason: "Pago cancelado",
    }, tx as never);
    await releaseGiftCardRedemptions({
      appointmentIds: ["apt1"], reason: "Pago cancelado",
    }, tx as never);
    expect(cardUpdate).toHaveBeenCalledTimes(1);
    expect(cardUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { remainingBalance: { increment: 10_000 }, status: "ACTIVE" },
    });
    expect(ledgerCreate).toHaveBeenCalledTimes(1);
  });

  it("restores consumed service entitlements when released", async () => {
    const entitlementUpdate = vi.fn();
    const tx = {
      giftCardRedemption: {
        findMany: vi.fn().mockResolvedValue([{
          id: "r1", appointmentId: "apt1", giftCardId: "c1",
          amountCovered: 20_000, status: "RESERVED",
          giftCard: { type: "SERVICE" },
          items: [{ entitlementId: "e1", quantity: 1 }],
        }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      giftCard: { update: vi.fn() },
      giftCardTransaction: { create: vi.fn() },
      giftCardServiceEntitlement: { update: entitlementUpdate },
    };
    await releaseGiftCardRedemptions({
      appointmentIds: ["apt1"], reason: "Pago cancelado",
    }, tx as never);
    expect(entitlementUpdate).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { quantityRemaining: { increment: 1 } },
    });
  });
});
