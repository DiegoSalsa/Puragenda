import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const appointmentFind = vi.hoisted(() => vi.fn());
const businessFind = vi.hoisted(() => vi.fn());
const clientFind = vi.hoisted(() => vi.fn());
const outerClientFind = vi.hoisted(() => vi.fn());
const eventCreate = vi.hoisted(() => vi.fn());
const clientUpdate = vi.hoisted(() => vi.fn());
const rewardCreate = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn());
const stampEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const rewardEmail = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const tx = { business: { findUnique: businessFind }, client: { findFirst: clientFind, update: clientUpdate }, loyaltyStampEvent: { create: eventCreate }, loyaltyCode: { create: rewardCreate } };
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { appointment: { findUnique: appointmentFind }, client: { findFirst: outerClientFind }, $transaction: transaction } }));
vi.mock("@/server/email/send", () => ({ sendLoyaltyStampEmail: stampEmail, sendLoyaltyRewardEmail: rewardEmail }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: vi.fn() }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn() }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: vi.fn() }));

import { adjustClientLoyaltyStampsAction, processLoyaltyStamps } from "@/server/actions/loyalty.actions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const program = { id: "business-1", name: "Bella", isLoyaltyEnabled: true, stampsRequired: 5, rewardName: "20%", discountType: "PERCENTAGE", discountValue: 20, loyaltyCodePrefix: "PREMIO", loyaltyRewardType: "PERCENTAGE", loyaltyRewardServiceId: null, loyaltyRewardExpirationDays: 30 };
const client = { id: "client-1", name: "María", email: "maria@example.com", currentStamps: 2 };

describe("loyalty stamp ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appointmentFind.mockResolvedValue({ id: "appointment-1", status: "COMPLETED", businessId: "business-1", clientId: "client-1" });
    businessFind.mockResolvedValue(program);
    clientFind.mockResolvedValue(client);
    eventCreate.mockResolvedValue({ id: "event-1" });
    clientUpdate.mockResolvedValue({});
    rewardCreate.mockResolvedValue({ code: "PREMIO-ABC", rewardType: "PERCENTAGE", discountValue: 20, expiresAt: new Date("2026-10-08") });
    transaction.mockImplementation(async (callback: (value: typeof tx) => unknown) => callback(tx));
    vi.mocked(getCurrentSessionUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(getBusinessForUser).mockResolvedValue({ id: "business-1" } as never);
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    outerClientFind.mockResolvedValue({ id: "client-1" });
  });

  it("records +1 in the ledger and keeps currentStamps consistent", async () => {
    await processLoyaltyStamps("appointment-1");
    expect(eventCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ appointmentId: "appointment-1", delta: 1, source: "APPOINTMENT" }) });
    expect(clientUpdate).toHaveBeenCalledWith({ where: { id: "client-1" }, data: { currentStamps: 3 } });
    expect(stampEmail).toHaveBeenCalledOnce();
  });

  it("creates one reward and starts a new card at the goal", async () => {
    clientFind.mockResolvedValue({ ...client, currentStamps: 4 });
    await processLoyaltyStamps("appointment-1");
    expect(rewardCreate).toHaveBeenCalledOnce();
    expect(rewardCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ expiresAt: expect.any(Date), rewardType: "PERCENTAGE" }) });
    expect(clientUpdate).toHaveBeenCalledWith({ where: { id: "client-1" }, data: { currentStamps: 0 } });
    expect(rewardEmail).toHaveBeenCalledOnce();
  });

  it("does not grant a stamp unless the appointment is completed", async () => {
    appointmentFind.mockResolvedValue({ id: "appointment-1", status: "CHECKED_IN", businessId: "business-1", clientId: "client-1" });
    await processLoyaltyStamps("appointment-1");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("treats the appointment unique constraint as an idempotent replay", async () => {
    eventCreate.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7.9.0" }));
    await expect(processLoyaltyStamps("appointment-1")).resolves.toBeUndefined();
    expect(clientUpdate).not.toHaveBeenCalled();
    expect(stampEmail).not.toHaveBeenCalled();
  });

  it("audits a manual adjustment in the ledger", async () => {
    const result = await adjustClientLoyaltyStampsAction({ clientId: "client-1", delta: 1, reason: "Corrección de atención" });

    expect(result).toEqual({ success: true });
    expect(outerClientFind).toHaveBeenCalledWith({ where: { id: "client-1", businessId: "business-1" }, select: { id: true } });
    expect(eventCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      businessId: "business-1",
      clientId: "client-1",
      delta: 1,
      source: "MANUAL",
      reason: "Corrección de atención",
      createdById: "user-1",
    }) });
  });

  it("does not adjust stamps without loyalty.manage", async () => {
    vi.mocked(hasBusinessPermission).mockResolvedValue(false);

    await expect(adjustClientLoyaltyStampsAction({ clientId: "client-1", delta: 1, reason: "Corrección" }))
      .resolves.toEqual({ error: "No tienes permisos para ajustar timbres" });
    expect(outerClientFind).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
