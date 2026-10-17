import { prisma } from "@/server/db/prisma";
import { BusinessesClient } from "./businesses-client";
import { getAdminSubscriptionReport } from "@/server/services/admin-subscription-report";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true, name: true, slug: true, countryCode: true, currencyCode: true, createdAt: true,
      owner: { select: { name: true, email: true } },
      subscription: true,
      affiliate: {
        select: {
          referralCode: true,
          paidReferrals: true,
          _count: { select: { referredBusinesses: true } },
        },
      },
      referredByAffiliate: {
        select: {
          referralCode: true,
          business: { select: { name: true } },
        },
      },
      _count: {
        select: { staff: true, services: true, appointments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <BusinessesClient businesses={businesses.map(business => ({
    ...business,
    subscription: business.subscription ? {
      id: business.subscription.id, plan: business.subscription.plan, status: business.subscription.status,
      isTrial: business.subscription.isTrial, trialEndsAt: business.subscription.trialEndsAt,
      currentPeriodEnd: business.subscription.currentPeriodEnd, mpSubscriptionId: business.subscription.mpSubscriptionId,
      paddleSubscriptionId: business.subscription.paddleSubscriptionId, paymentMethod: business.subscription.paymentMethod,
    } : null,
    billingReport: business.subscription ? getAdminSubscriptionReport(business.subscription, business) : null,
  }))} />;
}

