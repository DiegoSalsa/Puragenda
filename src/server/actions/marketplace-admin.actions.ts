"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { requireSuperAdminSession } from "@/server/auth/admin-session";
import { saveMarketplaceListing, type SaveMarketplaceListingInput } from "@/server/services/marketplace-admin.service";

async function requireSuperAdmin() {
  return requireSuperAdminSession();
}

export async function saveMarketplaceListingAction(input: SaveMarketplaceListingInput) {
  const admin = await requireSuperAdmin();
  const result = await saveMarketplaceListing(admin.id, input);
  if (result.ok) {
    revalidatePath(`${ADMIN_SECRET_PATH}/marketplace`);
    revalidatePath(`${ADMIN_SECRET_PATH}/marketplace/${input.businessId}`);
    revalidatePath("/barberias");
    revalidatePath("/peluquerias");
    revalidatePath("/negocios");
  }
  return result;
}
