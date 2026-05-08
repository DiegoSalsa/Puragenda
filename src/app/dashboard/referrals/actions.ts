"use server";

import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { redeemAffiliateReward } from "@/server/services/affiliate.service";
import { revalidatePath } from "next/cache";

export async function redeemRewardAction(): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentSessionUser();
  if (!user) return { success: false, error: "No autorizado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { success: false, error: "Negocio no encontrado" };

  const result = await redeemAffiliateReward(business.id);
  if (result.success) {
    revalidatePath("/dashboard/referrals");
  }
  return result;
}
