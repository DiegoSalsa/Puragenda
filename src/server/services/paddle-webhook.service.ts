import type {
  CustomerNotification,
  EventEntity,
  SubscriptionNotification,
  TransactionNotification,
} from "@paddle/paddle-node-sdk";
import { prisma } from "@/server/db/prisma";
import { notifySubscriptionPayment } from "@/server/services/subscription-payment-notification.service";

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

function validDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function syncCompletedTransaction(event: EventEntity, transaction: TransactionNotification) {
  if (transaction.status !== "completed" || !transaction.id || !transaction.subscriptionId) return;

  const localSubscription = await prisma.subscription.findFirst({
    where: { paddleSubscriptionId: transaction.subscriptionId },
    include: {
      business: {
        select: {
          name: true,
          currencyCode: true,
          countryCode: true,
          owner: { select: { email: true, name: true } },
        },
      },
    },
  });
  if (!localSubscription || localSubscription.business.countryCode === "CL") return;

  const paymentAt = validDate(transaction.billedAt) ?? validDate(transaction.updatedAt) ?? validDate(event.occurredAt);
  if (!paymentAt) return;

  const periodEnd = validDate(transaction.billingPeriod?.endsAt);
  await prisma.subscription.update({
    where: { id: localSubscription.id },
    data: {
      status: "ACTIVE",
      isTrial: false,
      ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
      paymentFailedAt: null,
      gracePeriodEndsAt: null,
      nextPaymentAttemptAt: null,
    },
  });

  const recovery = localSubscription.status === "PAST_DUE";
  const firstPayment = localSubscription.status === "INACTIVE";
  const fromTrial = localSubscription.status === "TRIALING" && localSubscription.isTrial;
  const totals = transaction.details?.totals;
  const amount = totals?.grandTotal ?? totals?.total ?? null;
  const currency = transaction.currencyCode ?? totals?.currencyCode ?? localSubscription.business.currencyCode;

  try {
    await notifySubscriptionPayment({
      subscriptionId: localSubscription.id,
      provider: "paddle",
      paymentId: transaction.id,
      invoiceId: transaction.invoiceId,
      businessName: localSubscription.business.name,
      ownerName: localSubscription.business.owner?.name ?? "No informado",
      ownerEmail: localSubscription.business.owner?.email ?? "No informado",
      plan: localSubscription.plan,
      billingCycle: localSubscription.billingCycle === "ANNUAL" ? "Anual" : "Mensual",
      paymentAt,
      amount,
      currency,
      amountIsMinorUnits: true,
      paymentType: recovery ? "Recuperación" : firstPayment || fromTrial ? "Primer pago" : "Renovación",
      firstPayment: firstPayment || fromTrial,
      fromTrial,
      recovery,
    });
  } catch (error) {
    console.error("[paddle-webhook] Admin payment notification failed", {
      subscriptionId: localSubscription.id,
      paymentId: transaction.id,
      error,
    });
  }
}

export async function processPaddleWebhook(event: EventEntity) {
  if (event.eventType === "customer.created" || event.eventType === "customer.updated") {
    await syncCustomer(event.data as CustomerNotification);
    return;
  }

  if (event.eventType.startsWith("subscription.")) {
    await syncSubscription(event, event.data as SubscriptionNotification);
    return;
  }

  // `transaction.completed` is the only Paddle event used here as proof of a
  // completed charge. Other transaction lifecycle events are intentionally
  // ignored to avoid notifying for created, authorized, pending, or duplicate
  // payment states.
  if (event.eventType === "transaction.completed") {
    await syncCompletedTransaction(event, event.data as TransactionNotification);
  }
}
