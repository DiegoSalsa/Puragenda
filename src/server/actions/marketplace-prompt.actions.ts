"use server";

import { revalidatePath } from "next/cache";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import {
  acceptExistingBusinessMarketplacePrompt,
  dismissExistingBusinessMarketplacePrompt,
  type ExistingBusinessMarketplacePromptInput,
} from "@/server/services/marketplace-onboarding.service";
import { existingBusinessMarketplacePromptSchema } from "@/server/validations/marketplace-prompt";

async function authorizedPromptContext() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" } as const;
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" } as const;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SETTINGS_MANAGE))) {
    return { error: "No tienes permisos para autorizar el directorio" } as const;
  }
  return { user, business } as const;
}

export async function dismissExistingBusinessMarketplacePromptAction() {
  const context = await authorizedPromptContext();
  if ("error" in context) return context;

  const result = await dismissExistingBusinessMarketplacePrompt(context.business.id, context.user.id);
  if (!result.ok) return { error: result.error };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function acceptExistingBusinessMarketplacePromptAction(
  input: ExistingBusinessMarketplacePromptInput,
) {
  const context = await authorizedPromptContext();
  if ("error" in context) return context;
  const parsed = existingBusinessMarketplacePromptSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisa los datos del directorio" };

  const result = await acceptExistingBusinessMarketplacePrompt(
    context.business.id,
    context.user.id,
    parsed.data,
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: true };
}
