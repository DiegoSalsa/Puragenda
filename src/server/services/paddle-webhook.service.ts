import type { CustomerNotification, EventEntity, SubscriptionNotification } from "@paddle/paddle-node-sdk";
import { prisma } from "@/server/db/prisma";

function subscriptionStatus(status: string) {
  switch (status) {
    case "active":
      return "ACTIVE" as const;
    case "trialing":
      return "TRIALING" as const;
    case "past_due":
      return "PAST_DUE" as const;
    case "canceled":
      return "CANCELLED" as const;
    default:
      return "INACTIVE" as const;
  }
}

function getBusinessId(customData: unknown) {
  if (!customData || typeof customData !== "object") return null;
  const value = (customData as Record<string, unknown>).puragenda_business_id;
  return typeof value === "string" && value.trim() ? value : null;
}

async function syncCustomer(customer: CustomerNotification) {
  const user = await prisma.user.findUnique({
    where: { email: customer.email },
    select: { id: true },
  });
  if (!user) return;

  const business = await prisma.business.findFirst({
    where: { ownerId: user.id, countryCode: { not: "CL" } },
    select: { id: true },
  });
  if (!business) return;

  await prisma.subscription.update({
    where: { businessId: business.id },
    data: { paddleCustomerId: customer.id },
  });
}

async function syncSubscription(event: EventEntity, subscription: SubscriptionNotification) {
  const businessId = getBusinessId(subscription.customData);
  if (!businessId) return;

  const localSubscription = await prisma.subscription.findUnique({
    where: { businessId },
    include: { business: { select: { countryCode: true } } },
  });
  if (!localSubscription || localSubscription.business.countryCode === "CL") return;

  const occurredAt = new Date(event.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return;
  if (localSubscription.paddleLastEventId === event.eventId) return;
  if (localSubscription.paddleLastEventAt && localSubscription.paddleLastEventAt > occurredAt) return;

  await prisma.subscription.update({
    where: { id: localSubscription.id },
    data: {
      paddleCustomerId: subscription.customerId,
      paddleSubscriptionId: subscription.id,
      paddlePriceIds: subscription.items.flatMap((item) => item.price?.id ? [item.price.id] : []),
      paddleLastEventAt: occurredAt,
      paddleLastEventId: event.eventId,
      status: subscriptionStatus(subscription.status),
      isTrial: subscription.status === "trialing",
      trialEndsAt: subscription.status === "trialing"
        ? subscription.currentBillingPeriod?.endsAt ? new Date(subscription.currentBillingPeriod.endsAt) : null
        : null,
      currentPeriodEnd: subscription.currentBillingPeriod?.endsAt
        ? new Date(subscription.currentBillingPeriod.endsAt)
        : null,
      paymentFailedAt: subscription.status === "past_due" ? occurredAt : null,
      gracePeriodEndsAt: null,
      nextPaymentAttemptAt: null,
    },
  });
}

export async function processPaddleWebhook(event: EventEntity) {
  if (event.eventType === "customer.created" || event.eventType === "customer.updated") {
    await syncCustomer(event.data as CustomerNotification);
    return;
  }

  if (event.eventType.startsWith("subscription.")) {
    await syncSubscription(event, event.data as SubscriptionNotification);
  }
}
