"use server";

import crypto from "crypto";
import { Prisma, type LoyaltyRewardType, type LoyaltyStampSource } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { sendLoyaltyRewardEmail, sendLoyaltyStampEmail } from "@/server/email/send";
import { getBusinessForUser } from "@/server/services/business.service";
import { buildLoyaltyRewardCode } from "@/server/services/loyalty-code.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

type LoyaltyProgram = {
  id: string; name: string; stampsRequired: number; rewardName: string | null;
  discountType: string | null; discountValue: number | null; loyaltyCodePrefix: string;
  loyaltyRewardType: LoyaltyRewardType; loyaltyRewardServiceId: string | null;
  loyaltyRewardExpirationDays: number | null;
};

function rewardExpiresAt(program: LoyaltyProgram, now: Date) {
  if (!program.loyaltyRewardExpirationDays) return null;
  return new Date(now.getTime() + program.loyaltyRewardExpirationDays * 86_400_000);
}

async function createReward(tx: Prisma.TransactionClient, program: LoyaltyProgram, clientId: string, now: Date) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = buildLoyaltyRewardCode(program.loyaltyCodePrefix, crypto.randomBytes(5).toString("hex").toUpperCase());
    try {
      return await tx.loyaltyCode.create({ data: {
        code, clientId, businessId: program.id, rewardType: program.loyaltyRewardType,
        discountType: program.loyaltyRewardType,
        discountValue: ["PERCENTAGE", "FIXED"].includes(program.loyaltyRewardType) ? program.discountValue : null,
        freeServiceId: program.loyaltyRewardType === "FREE_SERVICE" ? program.loyaltyRewardServiceId : null,
        rewardName: program.rewardName,
        expiresAt: rewardExpiresAt(program, now),
      } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
  throw new Error("No se pudo generar un código de fidelización único");
}

function programCanIssueReward(program: LoyaltyProgram) {
  if (program.stampsRequired < 2) return false;
  if (program.loyaltyRewardType === "PERCENTAGE") return !!program.discountValue && program.discountValue > 0 && program.discountValue <= 100;
  if (program.loyaltyRewardType === "FIXED") return !!program.discountValue && program.discountValue > 0;
  if (program.loyaltyRewardType === "FREE_SERVICE") return !!program.loyaltyRewardServiceId;
  return !!program.rewardName?.trim();
}

async function applyStampDelta(input: {
  businessId: string; clientId: string; delta: number; source: LoyaltyStampSource;
  appointmentId?: string; reason?: string; createdById?: string;
}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
    const [business, client] = await Promise.all([
      tx.business.findUnique({ where: { id: input.businessId }, select: {
        id: true, name: true, isLoyaltyEnabled: true, stampsRequired: true, rewardName: true,
        discountType: true, discountValue: true, loyaltyCodePrefix: true, loyaltyRewardType: true,
        loyaltyRewardServiceId: true, loyaltyRewardExpirationDays: true,
      } }),
      tx.client.findFirst({ where: { id: input.clientId, businessId: input.businessId }, select: {
        id: true, name: true, email: true, currentStamps: true,
      } }),
    ]);
    if (!business?.isLoyaltyEnabled || !client || !programCanIssueReward(business)) return { kind: "ignored" as const };

    const nextStamps = Math.max(0, client.currentStamps + input.delta);
    const effectiveDelta = nextStamps - client.currentStamps;
    if (effectiveDelta === 0) return { kind: "ignored" as const };

    await tx.loyaltyStampEvent.create({ data: {
      businessId: input.businessId, clientId: client.id, appointmentId: input.appointmentId,
      delta: effectiveDelta, source: input.source, reason: input.reason?.trim() || null,
      createdById: input.createdById,
    } });

    if (nextStamps >= business.stampsRequired) {
      const reward = await createReward(tx, business, client.id, new Date());
      await tx.client.update({ where: { id: client.id }, data: { currentStamps: nextStamps - business.stampsRequired } });
      return { kind: "reward" as const, client, business, reward };
    }
    await tx.client.update({ where: { id: client.id }, data: { currentStamps: nextStamps } });
    return { kind: "stamp" as const, client, business, currentStamps: nextStamps };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("No se pudo registrar el timbre después de reintentos de concurrencia");
}

/** Grants one stamp only when the appointment is COMPLETED. The unique database
 * key on LoyaltyStampEvent.appointmentId makes repeated/concurrent calls idempotent. */
export async function processLoyaltyStamps(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: {
    id: true, status: true, businessId: true, clientId: true,
  } });
  if (!appointment || appointment.status !== "COMPLETED" || !appointment.clientId) return;

  let result;
  try {
    result = await applyStampDelta({ businessId: appointment.businessId, clientId: appointment.clientId,
      appointmentId: appointment.id, delta: 1, source: "APPOINTMENT", reason: "Cita completada" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }

  if (result.kind === "reward") {
    void sendLoyaltyRewardEmail({
      clientEmail: result.client.email, clientName: result.client.name,
      stampsRequired: result.business.stampsRequired,
      rewardName: result.business.rewardName || "Premio de fidelización", rewardCode: result.reward.code,
      discountType: result.reward.rewardType, discountValue: result.reward.discountValue ?? 0,
      businessName: result.business.name, clientId: result.client.id, expiresAt: result.reward.expiresAt,
    }).catch((error) => console.error("[Loyalty] Error sending reward email:", error));
  } else if (result.kind === "stamp") {
    void sendLoyaltyStampEmail({
      clientEmail: result.client.email, clientName: result.client.name, currentStamps: result.currentStamps,
      stampsRequired: result.business.stampsRequired,
      rewardName: result.business.rewardName || "Premio de fidelización",
      businessName: result.business.name, clientId: result.client.id,
    }).catch((error) => console.error("[Loyalty] Error sending stamp email:", error));
  }
}

export async function adjustClientLoyaltyStampsAction(input: { clientId: string; delta: -1 | 1; reason: string }) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.LOYALTY_MANAGE))) return { error: "No tienes permisos para ajustar timbres" };
  const reason = input.reason.trim();
  if (reason.length < 3 || reason.length > 240) return { error: "Indica un motivo entre 3 y 240 caracteres" };
  if (input.delta !== 1 && input.delta !== -1) return { error: "Ajuste inválido" };
  const client = await prisma.client.findFirst({ where: { id: input.clientId, businessId: business.id }, select: { id: true } });
  if (!client) return { error: "Cliente no encontrado" };
  const result = await applyStampDelta({ businessId: business.id, clientId: client.id, delta: input.delta,
    source: "MANUAL", reason, createdById: user.id });
  revalidatePath("/dashboard/loyalty");
  return result.kind === "ignored" ? { error: "No fue posible aplicar el ajuste" } : { success: true };
}
