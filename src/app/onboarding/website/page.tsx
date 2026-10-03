import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { commercialQuote, hasPaidBase } from "@/websites/commercial";
import { publicWebsiteAcquisitionEnabled } from "@/server/websites/public-acquisition";
import { WEBSITE_CATALOG, websitePriceTier } from "@/websites/offers";
import { hasWebsitePaidAccess } from "@/websites/policy";
import { PurchaseFlow } from "./purchase-flow";

export const metadata: Metadata = { title: "Completar contratación", robots: { index: false, follow: false } };
export default async function WebsitePurchasePage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login?next=/onboarding/website");
  const business = await getBusinessForUser(user.id);
  if (!business || business.ownerId !== user.id || business.countryCode !== "CL") redirect("/dashboard");
  const [base, intent, addon, offer] = await Promise.all([
    prisma.subscription.findUnique({ where: { businessId: business.id } }),
    prisma.websitePurchaseIntent.findUnique({ where: { businessId: business.id } }),
    prisma.websiteAddon.findUnique({ where: { businessId: business.id } }),
    prisma.websiteOfferEligibility.findUnique({ where: { businessId: business.id } }),
  ]);
  const basePaid = hasPaidBase(base);
  // Observed only from the verified persisted BASE state, never query/return params.
  // This timestamp is the durable funnel measure; reloads do not count twice.
  const observed = basePaid && intent ? await prisma.websitePurchaseIntent.updateMany({ where: { businessId: business.id, baseActivatedAt: null }, data: { baseActivatedAt: new Date(), baseState: "ACTIVE" } }) : null;
  const plan = base?.plan === "EQUIPO" ? "EQUIPO" : "INDIVIDUAL";
  const cycle = base?.billingCycle === "ANNUAL" ? "annual" : "monthly";
  const quote = commercialQuote(plan, cycle, base?.extraStaffCount ?? 0);
  const tier = websitePriceTier(offer);
  return <main className="min-h-screen bg-[#FFFAEB] px-4 py-12 text-black"><div className="mx-auto max-w-2xl">
    <PurchaseFlow baseJustActivated={observed?.count === 1} plan={plan} cycle={cycle} extras={quote.extras} basePaid={basePaid} basePastDue={base?.status === "PAST_DUE"} basePending={!!base?.mpSubscriptionId || intent?.baseState === "CREATING" || intent?.baseState === "UNKNOWN"} basePrice={quote.baseCharge} websitePrice={Number(WEBSITE_CATALOG[tier].amount)} websiteActive={hasWebsitePaidAccess(addon)} websitePastDue={addon?.status === "PAST_DUE"} websitePending={!!addon?.mpSubscriptionId && addon.status === "INACTIVE"} enabled={tier === "BETA_FOUNDER" ? process.env.WEBSITE_CHECKOUT_ENABLED === "1" : publicWebsiteAcquisitionEnabled()} intentSaved={!!intent} />
  </div></main>;
}
