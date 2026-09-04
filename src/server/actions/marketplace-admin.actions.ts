"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { saveMarketplaceListing, type SaveMarketplaceListingInput } from "@/server/services/marketplace-admin.service";

async function requireSuperAdmin() {
  const user = await getCurrentSessionUser();
  if (!user || !user.isSuperAdmin || !user.adminAccess) {
    throw new Error("Acceso denegado");
  }
  return user;
}

export async function saveMarketplaceListingAction(input: SaveMarketplaceListingInput) {
  const admin = await requireSuperAdmin();
  const result = await saveMarketplaceListing(admin.id, input);
  if (result.ok) {
    revalidatePath(`${ADMIN_SECRET_PATH}/marketplace`);
    revalidatePath(`${ADMIN_SECRET_PATH}/marketplace/${input.businessId}`);
    revalidatePath("/barberias");
    revalidatePath("/peluquerias");
  }
  return result;
}
