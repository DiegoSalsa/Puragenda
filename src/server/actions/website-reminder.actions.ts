"use server";

import { prisma } from "@/server/db/prisma";
import { isDemoAccountEmail } from "@/server/auth/demo-session";
import { requireWebsiteManager } from "@/server/websites/service";
import { WebsiteError } from "@/server/websites/errors";
import { isWebsiteTrialReminderActive, websiteTrialReminderKey } from "@/websites/trial-reminder";

export async function dismissWebsiteTrialReminder() {
  try {
    const { business, user } = await requireWebsiteManager(true);
    if (isDemoAccountEmail(user.email) || !isWebsiteTrialReminderActive()) return { success: true };
    const offer = await prisma.websiteOfferEligibility.findUnique({ where: { businessId: business.id } });
    if (offer?.offerCode !== "BETA_FOUNDER") return { success: true };

    await prisma.websiteCommercialEvent.upsert({
      where: { key: websiteTrialReminderKey(business.id) },
      create: {
        key: websiteTrialReminderKey(business.id),
        businessId: business.id,
        event: "website_trial_reminder_dismissed",
        priceTier: "BETA_FOUNDER",
      },
      update: {},
    });
    return { success: true };
  } catch (error) {
    return { error: error instanceof WebsiteError ? error.message : "No pudimos guardar tu respuesta. Inténtalo de nuevo." };
  }
}
