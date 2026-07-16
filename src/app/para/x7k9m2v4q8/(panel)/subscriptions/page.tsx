import { prisma } from "@/server/db/prisma";
import { SubscriptionsClient } from "./subscriptions-client";
import { differenceInDays } from "date-fns";
import { calculateNextBillingPreview } from "@/server/services/subscription-billing.service";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const now = new Date();

  const subscriptions = await prisma.subscription.findMany({
    include: {
      business: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const subscriptionsWithBilling = subscriptions.map((subscription) => ({
    ...subscription,
    nextBillingPreview: calculateNextBillingPreview(subscription),
  }));

  const expiringSoon = subscriptionsWithBilling
    .filter(
      (s) =>
        s.isTrial &&
        s.status === "TRIALING" &&
        s.trialEndsAt &&
        differenceInDays(new Date(s.trialEndsAt), now) <= 7 &&
        differenceInDays(new Date(s.trialEndsAt), now) >= 0
    )
    .sort((a, b) => {
      const dA = differenceInDays(new Date(a.trialEndsAt!), now);
      const dB = differenceInDays(new Date(b.trialEndsAt!), now);
      return dA - dB;
    });

  const cancelled = subscriptionsWithBilling.filter((s) => s.status === "CANCELLED");

  const active = subscriptionsWithBilling.filter((s) => s.status === "ACTIVE" && !s.isTrial);

  return (
    <SubscriptionsClient
      expiringSoon={expiringSoon}
      cancelled={cancelled}
      active={active}
      allSubscriptions={subscriptionsWithBilling}
    />
  );
}
