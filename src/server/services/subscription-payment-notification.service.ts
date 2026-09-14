import { prisma } from "@/server/db/prisma";
import { sendSubscriptionPaymentAdminNotification } from "@/server/email/send";

export type SubscriptionPaymentNotificationInput = {
  subscriptionId: string;
  provider: "mercadopago" | "paddle";
  paymentId: string;
  invoiceId?: string | null;
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  plan: string;
  billingCycle: string;
  paymentAt: Date;
  amount?: number | string | null;
  currency?: string | null;
  amountIsMinorUnits?: boolean;
  paymentType: string;
  firstPayment: boolean;
  fromTrial: boolean;
  recovery: boolean;
};

function formatAmount(
  amount: number | string | null | undefined,
  currency?: string | null,
  amountIsMinorUnits = false,
) {
  if (amount === null || amount === undefined || amount === "") return null;
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);
  const code = (currency || "CLP").toUpperCase();
  try {
    const fractionDigits = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
    }).resolvedOptions().maximumFractionDigits ?? 2;
    const formatter = new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: code,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    const displayAmount = amountIsMinorUnits ? numeric / (10 ** fractionDigits) : numeric;
    return formatter.format(displayAmount);
  } catch {
    return `${numeric} ${code}`;
  }
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

/**
 * Claims a provider payment in a durable ledger before sending the admin email.
 * A FAILED claim is retryable; PENDING and SENT claims are owned by another
 * delivery attempt and are intentionally skipped to prevent duplicates.
 */
export async function notifySubscriptionPayment(data: SubscriptionPaymentNotificationInput) {
  let claimId: string | null = null;
  try {
    const created = await prisma.subscriptionPaymentNotification.create({
      data: {
        subscriptionId: data.subscriptionId,
        provider: data.provider,
        paymentId: data.paymentId,
        invoiceId: data.invoiceId ?? null,
        status: "PENDING",
      },
      select: { id: true },
    });
    claimId = created.id;
  } catch (error) {
    if (!isUniqueViolation(error)) {
      console.error("[subscription-payment-notification] Claim failed", error);
      return { sent: false, skipped: false };
    }

    const existing = await prisma.subscriptionPaymentNotification.findUnique({
      where: { provider_paymentId: { provider: data.provider, paymentId: data.paymentId } },
      select: { id: true, status: true, claimedAt: true },
    });
    if (!existing) return { sent: false, skipped: false };
    if (existing.status === "PENDING") {
      // A crashed server can leave a claim pending. Reclaim only after a
      // lease, so normal concurrent deliveries still skip safely.
      const leaseExpired = existing.claimedAt && existing.claimedAt < new Date(Date.now() - 15 * 60 * 1000);
      if (!leaseExpired) return { sent: false, skipped: true };
      const reclaimed = await prisma.subscriptionPaymentNotification.updateMany({
        where: { id: existing.id, status: "PENDING", claimedAt: existing.claimedAt },
        data: { claimedAt: new Date() },
      });
      if (reclaimed.count !== 1) return { sent: false, skipped: true };
      claimId = existing.id;
    } else if (existing.status === "SENT") {
      return { sent: false, skipped: true };
    } else {
      const reclaimed = await prisma.subscriptionPaymentNotification.updateMany({
        where: { id: existing.id, status: "FAILED" },
        data: { status: "PENDING", claimedAt: new Date(), failedAt: null },
      });
      if (reclaimed.count !== 1) return { sent: false, skipped: true };
      claimId = existing.id;
    }
  }

  if (!claimId) return { sent: false, skipped: false };

  let delivered = false;
  try {
    delivered = await sendSubscriptionPaymentAdminNotification({
      businessName: data.businessName,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      plan: data.plan,
      billingCycle: data.billingCycle,
      provider: data.provider === "mercadopago" ? "Mercado Pago" : "Paddle",
      paymentId: data.paymentId,
      invoiceId: data.invoiceId,
      paymentAt: data.paymentAt,
      amountLabel: formatAmount(data.amount, data.currency, data.amountIsMinorUnits),
      paymentType: data.paymentType,
      firstPayment: data.firstPayment,
      fromTrial: data.fromTrial,
      recovery: data.recovery,
    });
  } catch (error) {
    console.error("[subscription-payment-notification] Delivery failed", error);
  }

  if (delivered) {
    await prisma.subscriptionPaymentNotification.update({
      where: { id: claimId },
      data: { status: "SENT", sentAt: new Date(), failedAt: null },
    });
  } else {
    await prisma.subscriptionPaymentNotification.update({
      where: { id: claimId },
      data: { status: "FAILED", failedAt: new Date() },
    });
  }
  return { sent: delivered, skipped: false };
}
