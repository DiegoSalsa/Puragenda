"use server";

import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  spinRoulette,
  redeemFixedDiscount,
  activatePrize,
} from "@/server/services/affiliate.service";
import { revalidatePath } from "next/cache";

export async function spinRouletteAction() {
  const user = await getCurrentSessionUser();
  if (!user) return { success: false as const, error: "No autorizado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { success: false as const, error: "Negocio no encontrado" };

  const result = await spinRoulette(business.id);
  if (result.success) {
    revalidatePath("/dashboard/rewards");
    revalidatePath("/dashboard/referrals");
  }
  return result;
}

export async function redeemFixedDiscountAction() {
  const user = await getCurrentSessionUser();
  if (!user) return { success: false as const, error: "No autorizado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { success: false as const, error: "Negocio no encontrado" };

  const result = await redeemFixedDiscount(business.id);
  if (result.success) {
    revalidatePath("/dashboard/rewards");
    revalidatePath("/dashboard/referrals");
  }
  return result;
}

export async function activatePrizeAction(prizeId: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { success: false as const, error: "No autorizado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { success: false as const, error: "Negocio no encontrado" };

  const result = await activatePrize(business.id, prizeId);
  if (result.success) {
    revalidatePath("/dashboard/rewards");
    revalidatePath("/dashboard/referrals");
  }
  return result;
}
