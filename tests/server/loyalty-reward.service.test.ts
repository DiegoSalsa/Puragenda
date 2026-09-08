import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/server/db/prisma", () => ({ prisma: { loyaltyCode: { findUnique } } }));

import { claimLoyaltyReward, releaseLoyaltyReward, resolveLoyaltyReward } from "@/server/services/loyalty-reward.service";

const reward = {
  id: "reward-1", code: "PREMIO-1", businessId: "business-1", isUsed: false,
  expiresAt: null, rewardType: "PERCENTAGE", discountValue: 25, freeServiceId: null,
  client: { email: "maria@example.com" }, freeService: null,
};

describe("server-side loyalty redemption", () => {
  beforeEach(() => { vi.clearAllMocks(); findUnique.mockResolvedValue(reward); });

  it("resolves a canonical percentage quote", async () => {
    const result = await resolveLoyaltyReward({ code: " premio-1 ", businessId: "business-1", customerEmail: "MARIA@example.com", subtotal: 20_000, serviceBasePrices: new Map() });
    expect(result).toMatchObject({ quote: { discountAmount: 5_000, discountedTotal: 15_000 } });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: "PREMIO-1" } }));
  });

  it("rejects a reward from another business", async () => {
    findUnique.mockResolvedValue({ ...reward, businessId: "business-2" });
    await expect(resolveLoyaltyReward({ code: reward.code, businessId: "business-1", customerEmail: reward.client.email, subtotal: 10_000, serviceBasePrices: new Map() }))
      .resolves.toEqual({ error: "Este premio no pertenece a este negocio" });
  });

  it("rejects a reward from another client", async () => {
    await expect(resolveLoyaltyReward({ code: reward.code, businessId: reward.businessId, customerEmail: "otra@example.com", subtotal: 10_000, serviceBasePrices: new Map() }))
      .resolves.toEqual({ error: "Este premio no está asociado a tu correo electrónico" });
  });

  it("rejects used and expired rewards", async () => {
    findUnique.mockResolvedValueOnce({ ...reward, isUsed: true });
    expect(await resolveLoyaltyReward({ code: reward.code, businessId: reward.businessId, customerEmail: reward.client.email, subtotal: 10_000, serviceBasePrices: new Map() })).toEqual({ error: "Este premio ya fue utilizado" });
    findUnique.mockResolvedValueOnce({ ...reward, expiresAt: new Date("2026-01-01") });
    expect(await resolveLoyaltyReward({ code: reward.code, businessId: reward.businessId, customerEmail: reward.client.email, subtotal: 10_000, serviceBasePrices: new Map(), now: new Date("2026-01-02") })).toEqual({ error: "Este premio está vencido" });
  });

  it("claims once with an atomic conditional update and records redemption", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { loyaltyCode: { updateMany } } as never;
    expect(await claimLoyaltyReward(tx, { rewardId: "reward-1", appointmentId: "appointment-1", now: new Date("2026-09-08") })).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "reward-1", isUsed: false, redeemedAppointmentId: null }),
      data: expect.objectContaining({ isUsed: true, redeemedAppointmentId: "appointment-1", usedAt: expect.any(Date) }),
    }));
  });

  it("does not claim a reward when a concurrent request already won", async () => {
    const tx = { loyaltyCode: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) } } as never;
    expect(await claimLoyaltyReward(tx, { rewardId: "reward-1", appointmentId: "appointment-2" })).toBe(false);
  });

  it("releases only the reward consumed by the failed appointment", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    await releaseLoyaltyReward({ loyaltyCode: { updateMany } } as never, { rewardId: "reward-1", appointmentId: "appointment-1" });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "reward-1", isUsed: true, redeemedAppointmentId: "appointment-1" }, data: { isUsed: false, usedAt: null, redeemedAppointmentId: null } });
  });
});
