"use server";

import { revalidatePath } from "next/cache";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export async function setBusinessChristmasTheme(christmasEnabled: boolean) {
  if (typeof christmasEnabled !== "boolean") return { ok: false };

  const user = await getCurrentSessionUser();
  if (!user) return { ok: false };

  const business = await getBusinessForUser(user.id);
  if (!business || !(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { ok: false };
  }

  await prisma.businessDashboardAppearance.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, christmasEnabled },
    update: { christmasEnabled },
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
