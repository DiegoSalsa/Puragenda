import "server-only";
import { isV2Plan } from "@/server/services/commercial-plan-access";
import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { isDemoAccountEmail } from "@/server/auth/demo-session";
import { resolveTemplate } from "@/websites/registry";
import type { WebsiteLaunchContext } from "@/websites/launch";
import { websiteRootDomain } from "./service";

// Shared by the layout and home page; only the authenticated owner sees this offer.
// Reading the invitation never creates a website or consumes a trial.
export const getDashboardWebsiteLaunch = cache(async (): Promise<WebsiteLaunchContext | null> => {
  if (process.env.WEBSITE_LAUNCH_ENABLED !== "1") return null;
  const user = await getCurrentSessionUser();
  if (!user || isDemoAccountEmail(user.email)) return null;
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt || business.ownerId !== user.id) return null;
  const subscription = await prisma.subscription.findUnique({ where: { businessId: business.id }, select: { plan: true } });
  if (isV2Plan(subscription?.plan)) return null;
  const [offer, addon, site, services, locations] = await Promise.all([
    prisma.websiteOfferEligibility.findUnique({ where: { businessId: business.id }, select: { offerCode: true, eligibleAt: true, trialStartedAt: true, trialEndsAt: true, trialConsumedAt: true } }),
    prisma.websiteAddon.findUnique({ where: { businessId: business.id }, select: { status: true, validUntil: true, cancelAt: true } }),
    prisma.businessWebsite.findUnique({ where: { businessId: business.id }, select: { templateKey: true, templateVersion: true, draftConfig: true, subdomain: true, status: true } }),
    prisma.service.count({ where: { businessId: business.id, bookingMode: "APPOINTMENT" } }),
    prisma.businessLocation.count({ where: { businessId: business.id, isActive: true } }),
  ]);
  const template = resolveTemplate(site?.templateKey ?? "bella", site?.templateVersion ?? 1);
  const config = site ? template.readConfig(site.draftConfig) : template.defaultConfig();
  return {
    offer,
    addon: addon ? { status: addon.status, validUntil: addon.validUntil?.toISOString() ?? null, cancelAt: addon.cancelAt?.toISOString() ?? null } : null,
    canManage: true,
    canActivateTrial: process.env.WEBSITE_CHECKOUT_ENABLED === "1",
    preview: {
      businessName: business.name,
      templateName: template.name,
      coverImage: config.heroImage || template.preview.thumbnail,
      address: site ? `${site.subdomain}.${websiteRootDomain()}` : null,
      ready: !!site && !template.publicationError(config),
      servicesReady: services > 0,
      bookingReady: services > 0 && locations > 0,
      published: site?.status === "PUBLISHED",
    },
  };
});
