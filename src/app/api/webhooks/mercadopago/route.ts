import crypto from "crypto";
import { addMonths, addYears } from "date-fns";
import { Invoice, PreApproval } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { mpClient } from "@/server/lib/mercadopago";
import {
  getMercadoPagoInvoiceByPaymentId,
  processMercadoPagoInvoice,
  type MercadoPagoInvoiceSnapshot,
} from "@/server/services/subscription-dunning.service";

function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | undefined
) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    console.warn(
      "[webhook/mp] MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature verification"
    );
    return true;
  }

  if (!xSignature || !xRequestId) return false;

  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key && valueParts.length > 0) {
      parts[key] = valueParts.join("=");
    }
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId || ""};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(v1);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function dateOrNull(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function processPreapproval(resourceId: string) {
  const preapproval = new PreApproval(mpClient);
  const mpSubscription = await preapproval.get({ id: resourceId });

  if (!mpSubscription?.id) {
    return { handled: false, reason: "preapproval_not_found" };
  }

  const subscription = await prisma.subscription.findFirst({
    where: { mpSubscriptionId: mpSubscription.id },
  });
  if (!subscription) {
    return { handled: false, reason: "subscription_not_found" };
  }

  if (mpSubscription.status === "authorized") {
    // An authorized preapproval only proves that the recurring agreement is
    // active. It must never clear a PAST_DUE state; invoice notifications do.
    const canActivateOnboarding =
      (subscription.status === "INACTIVE" ||
        subscription.status === "TRIALING") &&
      !subscription.paymentFailedAt;

    if (!canActivateOnboarding) {
      return { handled: true, state: subscription.status };
    }

    const providerPeriodEnd = dateOrNull(mpSubscription.next_payment_date);
    const fallbackPeriodEnd =
      subscription.billingCycle === "ANNUAL"
        ? addYears(new Date(), 1)
        : addMonths(new Date(), 1);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        isTrial: false,
        currentPeriodEnd: providerPeriodEnd ?? fallbackPeriodEnd,
      },
    });

    return { handled: true, state: "ACTIVE" };
  }

  if (
    mpSubscription.status === "cancelled" ||
    mpSubscription.status === "canceled"
  ) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED" },
    });
    return { handled: true, state: "CANCELLED" };
  }

  if (mpSubscription.status === "paused") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "INACTIVE" },
    });
    return { handled: true, state: "INACTIVE" };
  }

  return { handled: true, state: mpSubscription.status ?? "unknown" };
}

async function processPaymentNotification(resourceId: string) {
  const paymentId = Number(resourceId);
  if (!Number.isFinite(paymentId)) {
    return { handled: false, reason: "invalid_payment_id" };
  }

  const invoice = await getMercadoPagoInvoiceByPaymentId(paymentId);

  if (!invoice) {
    // The payment may belong to deposits or another integration.
    return { handled: false, reason: "subscription_invoice_not_found" };
  }

  return processMercadoPagoInvoice(invoice);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: Record<string, unknown>;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const dataId = (body.data as Record<string, unknown> | undefined)?.id;
    const resourceId =
      typeof dataId === "string" || typeof dataId === "number"
        ? String(dataId)
        : undefined;

    if (
      !verifyWebhookSignature(
        request.headers.get("x-signature"),
        request.headers.get("x-request-id"),
        resourceId
      )
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const notificationType = body.type as string | undefined;
    if (!notificationType || !resourceId) {
      return NextResponse.json({ received: true });
    }

    if (notificationType === "subscription_authorized_payment") {
      const invoiceClient = new Invoice(mpClient);
      const invoice = (await invoiceClient.get({
        id: resourceId,
      })) as MercadoPagoInvoiceSnapshot;
      const result = await processMercadoPagoInvoice(invoice);
      return NextResponse.json({ received: true, result });
    }

    if (notificationType === "subscription_preapproval") {
      const result = await processPreapproval(resourceId);
      return NextResponse.json({ received: true, result });
    }

    if (notificationType === "payment") {
      const result = await processPaymentNotification(resourceId);
      return NextResponse.json({ received: true, result });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Return a retryable status: losing billing notifications is worse than a
    // duplicate because invoice processing is idempotent by invoice/payment ID.
    console.error("[webhook/mp] Error processing notification:", error);
    return NextResponse.json(
      { received: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
