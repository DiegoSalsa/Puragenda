import { addDays, addHours, addMonths, addYears } from "date-fns";
import { Invoice, PreApproval } from "mercadopago";

import { prisma } from "@/server/db/prisma";
import { mpClient } from "@/server/lib/mercadopago";
import { incrementPaidReferrals } from "@/server/services/affiliate.service";
import { markPlatformDiscountApplied } from "@/server/services/platform-discount.service";
import { advanceBillingBenefitAfterAuthorized } from "@/server/services/subscription-billing.service";
import {
  sendSubscriptionPaymentFailedEmail,
  sendSubscriptionPaymentRecoveredEmail,
} from "@/server/email/send";
import { notifySubscriptionPayment } from "@/server/services/subscription-payment-notification.service";
export { hasDunningAccess } from "@/core/subscription-access";

export const DUNNING_GRACE_HOURS = 48;
export const PROVIDER_RETRY_BUFFER_HOURS = 6;

export type MercadoPagoInvoiceSnapshot = {
  id?: string;
  preapproval_id?: string;
  status?: string;
  summarized?: string;
  retry_attempt?: number;
  debit_date?: string;
  currency_id?: string;
  last_modified?: string;
  date_created?: string;
  transaction_amount?: number;
  payment?: {
    id?: string;
    status?: string;
    status_detail?: string;
  };
};

function validDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateGracePeriodEnd(
  attemptAt: Date,
  nextProviderAttemptAt?: Date | null
) {
  const rollingGraceEnd = addHours(attemptAt, DUNNING_GRACE_HOURS);
  if (!nextProviderAttemptAt || nextProviderAttemptAt <= attemptAt) {
    return rollingGraceEnd;
  }

  const providerSafeEnd = addHours(
    nextProviderAttemptAt,
    PROVIDER_RETRY_BUFFER_HOURS
  );
  return providerSafeEnd > rollingGraceEnd ? providerSafeEnd : rollingGraceEnd;
}

export function nextPaidPeriodEnd(
  billingCycle: "MONTHLY" | "ANNUAL",
  debitDate: Date,
  existingPeriodEnd?: Date | null
) {
  const calculated =
    billingCycle === "ANNUAL" ? addYears(debitDate, 1) : addMonths(debitDate, 1);
  return existingPeriodEnd && existingPeriodEnd > calculated
    ? existingPeriodEnd
    : calculated;
}

function isApprovedInvoice(invoice: MercadoPagoInvoiceSnapshot) {
  return invoice.payment?.status === "approved";
}

function isRejectedInvoice(invoice: MercadoPagoInvoiceSnapshot) {
  return (
    invoice.payment?.status === "rejected" ||
    invoice.payment?.status === "cancelled" ||
    invoice.status === "recycling"
  );
}

function invoiceActivityAt(invoice: MercadoPagoInvoiceSnapshot, now: Date) {
  return (
    validDate(invoice.last_modified) ??
    validDate(invoice.debit_date) ??
    validDate(invoice.date_created) ??
    now
  );
}

function invoiceNextAttemptAt(invoice: MercadoPagoInvoiceSnapshot, now: Date) {
  const debitDate = validDate(invoice.debit_date);
  return debitDate && debitDate > now ? debitDate : null;
}

function isStaleFailureAfterRecovery(
  subscription: {
    status: string;
    lastPaymentStatus?: string | null;
    lastPaymentAttemptAt?: Date | null;
  },
  activityAt: Date
) {
  return (
    subscription.status === "ACTIVE" &&
    subscription.lastPaymentStatus === "approved" &&
    !!subscription.lastPaymentAttemptAt &&
    activityAt <= subscription.lastPaymentAttemptAt
  );
}

export async function processMercadoPagoInvoice(
  invoice: MercadoPagoInvoiceSnapshot,
  now = new Date()
) {
  if (!invoice.id || !invoice.preapproval_id) {
    return { handled: false as const, reason: "missing_invoice_identity" };
  }

  const subscription = await prisma.subscription.findFirst({
    where: { mpSubscriptionId: invoice.preapproval_id },
    include: {
      business: {
        select: {
          name: true,
          currencyCode: true,
          owner: { select: { email: true, name: true } },
        },
      },
    },
  });

  if (!subscription) {
    return { handled: false as const, reason: "subscription_not_found" };
  }

  const activityAt = invoiceActivityAt(invoice, now);
  const retryCount = Math.max(invoice.retry_attempt ?? 0, 0);
  const paymentId = invoice.payment?.id?.toString() ?? null;
  const paymentStatus = invoice.payment?.status ?? null;
  const paymentStatusDetail = invoice.payment?.status_detail ?? null;

  if (isApprovedInvoice(invoice)) {
    const debitDate =
      validDate(invoice.debit_date) ??
      validDate(invoice.date_created) ??
      activityAt;
    const periodEnd = nextPaidPeriodEnd(
      subscription.billingCycle,
      debitDate,
      subscription.currentPeriodEnd
    );
    if (
      subscription.status === "PAST_DUE" &&
      subscription.paymentFailedAt &&
      activityAt <= subscription.paymentFailedAt
    ) {
      return {
        handled: false as const,
        reason: "stale_approved_invoice",
      };
    }
    const historicalInvoiceAlreadyAccounted =
      !subscription.lastInvoiceId &&
      subscription.status === "ACTIVE" &&
      !!subscription.currentPeriodEnd &&
      periodEnd <= subscription.currentPeriodEnd;
    const alreadyProcessed =
      historicalInvoiceAlreadyAccounted ||
      (subscription.lastInvoiceId === invoice.id &&
        subscription.lastPaymentStatus === "approved");
    const wasPastDue = subscription.status === "PAST_DUE";

    if (
      !alreadyProcessed &&
      subscription.activePrizeId &&
      subscription.freeMonthsRemaining <= 1
    ) {
      await prisma.$transaction([
        prisma.prize.update({
          where: { id: subscription.activePrizeId },
          data: { status: "USED" },
        }),
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { activePrizeId: null },
        }),
      ]);
    }

    const activeData = {
      status: "ACTIVE",
      isTrial: false,
      currentPeriodEnd: periodEnd,
      paymentFailedAt: null,
      gracePeriodEndsAt: null,
      nextPaymentAttemptAt: null,
      lastInvoiceId: invoice.id,
      lastInvoiceStatus: invoice.status ?? null,
      lastPaymentId: paymentId,
      lastPaymentStatus: paymentStatus,
      lastPaymentStatusDetail: paymentStatusDetail,
      lastPaymentAttemptAt: activityAt,
      paymentRetryCount: retryCount,
      dunningEmailSentAt: null,
      graceExpiryWarningSentAt: null,
      hasCountedAsPaidReferral: true,
    } as const;

    if (wasPastDue) {
      // Only one concurrent recovery may transition PAST_DUE -> ACTIVE and send
      // the recovery email. A newer failed attempt also wins by timestamp.
      const activated = await prisma.subscription.updateMany({
        where: {
          id: subscription.id,
          status: "PAST_DUE",
          OR: [
            { lastPaymentAttemptAt: null },
            { lastPaymentAttemptAt: { lt: activityAt } },
          ],
        },
        data: activeData,
      });
      if (activated.count === 0) {
        return {
          handled: false as const,
          reason: "stale_or_duplicate_approved_invoice",
        };
      }
    } else {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: activeData,
      });
    }

    if (!alreadyProcessed) {
      const billingSync = await advanceBillingBenefitAfterAuthorized(
        subscription.id
      );
      if (!billingSync.success) {
        console.warn(
          "[subscription-dunning] Invoice approved but next amount sync failed:",
          billingSync.error
        );
      }

      await markPlatformDiscountApplied(subscription.id);

      if (!subscription.hasCountedAsPaidReferral) {
        await incrementPaidReferrals(subscription.businessId);
      }
    }

    if (wasPastDue && subscription.business.owner?.email) {
      await sendSubscriptionPaymentRecoveredEmail({
        ownerEmail: subscription.business.owner.email,
        ownerName: subscription.business.owner.name,
        businessName: subscription.business.name,
        periodEnd,
      });
    }

    if (!alreadyProcessed) {
      const fromTrial = subscription.status === "TRIALING" && subscription.isTrial;
      const firstPayment = fromTrial || subscription.status === "INACTIVE";
      try {
        await notifySubscriptionPayment({
          subscriptionId: subscription.id,
          provider: "mercadopago",
          paymentId: paymentId ?? invoice.id,
          invoiceId: invoice.id,
          businessName: subscription.business.name,
          ownerName: subscription.business.owner?.name ?? "No informado",
          ownerEmail: subscription.business.owner?.email ?? "No informado",
          plan: subscription.plan,
          billingCycle: subscription.billingCycle === "ANNUAL" ? "Anual" : "Mensual",
          paymentAt: activityAt,
          amount: invoice.transaction_amount,
          currency: invoice.currency_id ?? subscription.business.currencyCode,
          paymentType: wasPastDue ? "Recuperación" : firstPayment ? "Primer pago" : "Renovación",
          firstPayment,
          fromTrial,
          recovery: wasPastDue,
        });
      } catch (error) {
        console.error("[subscription-dunning] Admin payment notification failed", {
          subscriptionId: subscription.id,
          paymentId: paymentId ?? invoice.id,
          error,
        });
      }
    }

    return {
      handled: true as const,
      state: "ACTIVE" as const,
      subscriptionId: subscription.id,
      alreadyProcessed,
    };
  }

  if (isRejectedInvoice(invoice)) {
    // Mercado Pago retries webhook delivery and does not guarantee arrival
    // order. Never let an older rejected attempt overwrite a newer approved
    // payment that already restored access.
    if (isStaleFailureAfterRecovery(subscription, activityAt)) {
      return {
        handled: false as const,
        reason: "stale_rejected_invoice",
      };
    }

    const nextAttemptAt = invoiceNextAttemptAt(invoice, now);
    const isNewAttempt =
      subscription.lastInvoiceId !== invoice.id ||
      subscription.lastPaymentId !== paymentId ||
      subscription.paymentRetryCount !== retryCount;
    const gracePeriodEndsAt = isNewAttempt
      ? calculateGracePeriodEnd(activityAt, nextAttemptAt)
      : subscription.gracePeriodEndsAt ??
        calculateGracePeriodEnd(activityAt, nextAttemptAt);
    const transitioned = await prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        // Re-evaluate ordering in the write itself: neither a recovery nor a
        // newer failed attempt committed after our read may be overwritten.
        OR: [
          { lastPaymentAttemptAt: null },
          { lastPaymentAttemptAt: { lt: activityAt } },
          {
            lastPaymentAttemptAt: activityAt,
            paymentRetryCount: { lt: retryCount },
          },
        ],
      },
      data: {
        status: "PAST_DUE",
        paymentFailedAt: subscription.paymentFailedAt ?? activityAt,
        gracePeriodEndsAt,
        nextPaymentAttemptAt: nextAttemptAt,
        lastInvoiceId: invoice.id,
        lastInvoiceStatus: invoice.status ?? null,
        lastPaymentId: paymentId,
        lastPaymentStatus: paymentStatus,
        lastPaymentStatusDetail: paymentStatusDetail,
        lastPaymentAttemptAt: activityAt,
        paymentRetryCount: retryCount,
        graceExpiryWarningSentAt: isNewAttempt
          ? null
          : subscription.graceExpiryWarningSentAt,
      },
    });
    if (transitioned.count === 0) {
      return {
        handled: false as const,
        reason: "stale_rejected_invoice",
      };
    }

    if (subscription.business.owner?.email) {
      const claimed = await prisma.subscription.updateMany({
        where: {
          id: subscription.id,
          status: "PAST_DUE",
          lastInvoiceId: invoice.id,
          dunningEmailSentAt: null,
        },
        data: { dunningEmailSentAt: now },
      });
      const delivered =
        claimed.count === 1 &&
        (await sendSubscriptionPaymentFailedEmail({
          ownerEmail: subscription.business.owner.email,
          ownerName: subscription.business.owner.name,
          businessName: subscription.business.name,
          gracePeriodEndsAt,
          nextPaymentAttemptAt: nextAttemptAt,
          amount: invoice.transaction_amount ?? null,
        }));
      if (claimed.count === 1 && !delivered) {
        await prisma.subscription.updateMany({
          where: {
            id: subscription.id,
            status: "PAST_DUE",
            lastInvoiceId: invoice.id,
            dunningEmailSentAt: now,
          },
          data: { dunningEmailSentAt: null },
        });
      }
    }

    return {
      handled: true as const,
      state: "PAST_DUE" as const,
      subscriptionId: subscription.id,
      gracePeriodEndsAt,
      nextAttemptAt,
      isNewAttempt,
    };
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      lastInvoiceId: invoice.id,
      lastInvoiceStatus: invoice.status ?? null,
      lastPaymentId: paymentId,
      lastPaymentStatus: paymentStatus,
      lastPaymentStatusDetail: paymentStatusDetail,
      lastPaymentAttemptAt: activityAt,
      paymentRetryCount: retryCount,
      nextPaymentAttemptAt: invoiceNextAttemptAt(invoice, now),
    },
  });

  return {
    handled: true as const,
    state: "PENDING" as const,
    subscriptionId: subscription.id,
  };
}

export async function getLatestMercadoPagoInvoice(
  mpSubscriptionId: string
) {
  const invoiceClient = new Invoice(mpClient);
  const response = await invoiceClient.search({
    options: { preapproval_id: mpSubscriptionId },
  });
  const invoices = (response.results ?? []) as MercadoPagoInvoiceSnapshot[];
  const actionableInvoices = invoices.filter(
    (invoice) =>
      !!invoice.payment?.status ||
      invoice.status === "recycling" ||
      invoice.status === "processed"
  );
  const candidates =
    actionableInvoices.length > 0 ? actionableInvoices : invoices;

  return (
    candidates.sort((left, right) => {
      const leftDate =
        validDate(left.last_modified)?.getTime() ??
        validDate(left.date_created)?.getTime() ??
        0;
      const rightDate =
        validDate(right.last_modified)?.getTime() ??
        validDate(right.date_created)?.getTime() ??
        0;
      return rightDate - leftDate;
    })[0] ?? null
  );
}

export async function getMercadoPagoInvoiceByPaymentId(paymentId: number) {
  const invoiceClient = new Invoice(mpClient);
  // Although the API response is paginated, Mercado Pago currently rejects
  // an explicit `limit` on this endpoint for production subscription calls.
  const response = await invoiceClient.search({
    options: { payment_id: paymentId },
  });
  const invoices = (response.results ?? []) as MercadoPagoInvoiceSnapshot[];

  return (
    invoices.find(
      (invoice) => invoice.payment?.id?.toString() === paymentId.toString()
    ) ?? null
  );
}

export async function reconcileMercadoPagoSubscription(
  mpSubscriptionId: string
) {
  const latestInvoice = await getLatestMercadoPagoInvoice(mpSubscriptionId);
  if (!latestInvoice) {
    // The invoice search endpoint can return an empty page when the configured
    // credential does not own the preapproval. Verify ownership so this is
    // reported as a reconciliation error instead of a false "no invoice".
    const preapprovalClient = new PreApproval(mpClient);
    await preapprovalClient.get({ id: mpSubscriptionId });
    return { handled: false as const, reason: "invoice_not_found" };
  }
  return processMercadoPagoInvoice(latestInvoice);
}

export async function runBillingReconciliation(now = new Date()) {
  const results = {
    checked: 0,
    reconciled: 0,
    notices: 0,
    warnings: 0,
    errors: [] as string[],
  };

  const subscriptions = await prisma.subscription.findMany({
    where: {
      mpSubscriptionId: { not: null },
      OR: [
        { status: "PAST_DUE" },
        {
          status: "ACTIVE",
          currentPeriodEnd: { lte: addDays(now, 1) },
        },
      ],
    },
    select: { id: true, mpSubscriptionId: true },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });

  for (const subscription of subscriptions) {
    if (!subscription.mpSubscriptionId) continue;
    results.checked++;
    try {
      const result = await reconcileMercadoPagoSubscription(
        subscription.mpSubscriptionId
      );
      if (result.handled) results.reconciled++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      results.errors.push(`${subscription.id}: ${message}`);
      console.error("[subscription-dunning] Reconciliation failed", {
        subscriptionId: subscription.id,
        message,
      });
    }
  }

  const unsentNotices = await prisma.subscription.findMany({
    where: {
      status: "PAST_DUE",
      dunningEmailSentAt: null,
      gracePeriodEndsAt: { gt: now },
    },
    include: {
      business: {
        select: {
          name: true,
          owner: { select: { email: true, name: true } },
        },
      },
    },
    take: 100,
  });

  for (const subscription of unsentNotices) {
    const owner = subscription.business.owner;
    if (!owner?.email || !subscription.gracePeriodEndsAt) continue;

    const claimed = await prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        status: "PAST_DUE",
        dunningEmailSentAt: null,
        gracePeriodEndsAt: { gt: now },
      },
      data: { dunningEmailSentAt: now },
    });
    if (claimed.count === 0) continue;

    const delivered = await sendSubscriptionPaymentFailedEmail({
      ownerEmail: owner.email,
      ownerName: owner.name,
      businessName: subscription.business.name,
      gracePeriodEndsAt: subscription.gracePeriodEndsAt,
      nextPaymentAttemptAt: subscription.nextPaymentAttemptAt,
    });
    if (!delivered) {
      await prisma.subscription.updateMany({
        where: { id: subscription.id, status: "PAST_DUE", dunningEmailSentAt: now },
        data: { dunningEmailSentAt: null },
      });
      continue;
    }
    results.notices++;
  }

  const expiringGrace = await prisma.subscription.findMany({
    where: {
      status: "PAST_DUE",
      graceExpiryWarningSentAt: null,
      gracePeriodEndsAt: { gt: now, lte: addHours(now, 6) },
    },
    include: {
      business: {
        select: {
          name: true,
          owner: { select: { email: true, name: true } },
        },
      },
    },
    take: 100,
  });

  for (const subscription of expiringGrace) {
    const owner = subscription.business.owner;
    if (!owner?.email || !subscription.gracePeriodEndsAt) continue;

    const claimed = await prisma.subscription.updateMany({
      where: {
        id: subscription.id,
        status: "PAST_DUE",
        graceExpiryWarningSentAt: null,
        gracePeriodEndsAt: { gt: now, lte: addHours(now, 6) },
      },
      data: { graceExpiryWarningSentAt: now },
    });
    if (claimed.count === 0) continue;

    const delivered = await sendSubscriptionPaymentFailedEmail({
      ownerEmail: owner.email,
      ownerName: owner.name,
      businessName: subscription.business.name,
      gracePeriodEndsAt: subscription.gracePeriodEndsAt,
      nextPaymentAttemptAt: subscription.nextPaymentAttemptAt,
      finalWarning: true,
    });
    if (!delivered) {
      await prisma.subscription.updateMany({
        where: { id: subscription.id, status: "PAST_DUE", graceExpiryWarningSentAt: now },
        data: { graceExpiryWarningSentAt: null },
      });
      continue;
    }
    results.warnings++;
  }

  return results;
}
