import { prisma } from "@/server/db/prisma";
import { SubscriptionsClient } from "./subscriptions-client";
import { differenceInDays } from "date-fns";

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

  const expiringSoon = subscriptions
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

  const cancelled = subscriptions.filter((s) => s.status === "CANCELLED");

  const active = subscriptions.filter((s) => s.status === "ACTIVE" && !s.isTrial);

  return (
    <SubscriptionsClient
      expiringSoon={expiringSoon}
      cancelled={cancelled}
      active={active}
      allSubscriptions={subscriptions}
    />
  );
}
