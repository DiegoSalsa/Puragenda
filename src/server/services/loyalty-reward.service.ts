import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { calculateLoyaltyReward } from "@/core/loyalty";

export async function resolveLoyaltyReward(input: {
  code: string;
  businessId: string;
  customerEmail: string;
  subtotal: number;
  serviceBasePrices: ReadonlyMap<string, number>;
  now?: Date;
}) {
  const code = input.code.trim().toUpperCase();
  const now = input.now ?? new Date();
  if (!code) return { error: "Ingresa un código de premio" } as const;

  const reward = await prisma.loyaltyCode.findUnique({
    where: { code },
    include: {
      client: { select: { email: true } },
      freeService: { select: { id: true, name: true, businessId: true, price: true } },
    },
  });

  if (!reward) return { error: "Código de premio no encontrado" } as const;
  if (reward.businessId !== input.businessId) return { error: "Este premio no pertenece a este negocio" } as const;
  if (reward.client.email.trim().toLowerCase() !== input.customerEmail.trim().toLowerCase()) {
    return { error: "Este premio no está asociado a tu correo electrónico" } as const;
  }
  if (reward.isUsed) return { error: "Este premio ya fue utilizado" } as const;
  if (reward.expiresAt && reward.expiresAt <= now) return { error: "Este premio está vencido" } as const;
  if (reward.rewardType === "FREE_SERVICE" && reward.freeService?.businessId !== input.businessId) {
    return { error: "El servicio gratuito configurado no es válido" } as const;
  }

  const calculated = calculateLoyaltyReward({
    rewardType: reward.rewardType,
    discountValue: reward.discountValue,
    freeServiceId: reward.freeServiceId,
    subtotal: input.subtotal,
    serviceBasePrices: input.serviceBasePrices,
  });
  if ("error" in calculated) return calculated;

  return { reward, quote: calculated } as const;
}

export async function claimLoyaltyReward(
  tx: Prisma.TransactionClient,
  input: { rewardId: string; appointmentId: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const claimed = await tx.loyaltyCode.updateMany({
    where: {
      id: input.rewardId,
      isUsed: false,
      redeemedAppointmentId: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    data: {
      isUsed: true,
      usedAt: now,
      redeemedAppointmentId: input.appointmentId,
    },
  });
  return claimed.count === 1;
}

export async function releaseLoyaltyReward(
  tx: Prisma.TransactionClient,
  input: { rewardId: string; appointmentId: string },
) {
  return tx.loyaltyCode.updateMany({
    where: {
      id: input.rewardId,
      isUsed: true,
      redeemedAppointmentId: input.appointmentId,
    },
    data: { isUsed: false, usedAt: null, redeemedAppointmentId: null },
  });
}
