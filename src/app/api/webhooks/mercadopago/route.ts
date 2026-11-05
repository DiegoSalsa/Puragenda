import { Invoice, PreApproval } from "mercadopago";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/server/db/prisma";
import { mpClient } from "@/server/lib/mercadopago";
import {
  getMercadoPagoInvoiceByPaymentId,
  processMercadoPagoInvoice,
  type MercadoPagoInvoiceSnapshot,
} from "@/server/services/subscription-dunning.service";
import { stateForCancelledProviderSubscription } from "@/server/services/subscription-billing.service";
import { verifyMercadoPagoWebhookSignature } from "@/server/lib/mercadopago-webhook";
import { syncMercadoPagoWebsitePreapproval, syncMercadoPagoWebsiteInvoice } from "@/server/websites/mercadopago-billing";
import { handleMpV2Webhook } from "@/server/commercial-billing/mercadopago-v2";
import {reconcileLegacyPlusInvoice, reconcileLegacyPlusOperation} from "@/server/commercial-billing/legacy-plus";

async function processPreapproval(resourceId: string, reconcileV2: () => Promise<void>) {
  const preapproval = new PreApproval(mpClient);
  const mpSubscription = await preapproval.get({ id: resourceId });

  if (!mpSubscription?.id) {
    return { handled: false, reason: "preapproval_not_found" };
  }

  if (mpSubscription.external_reference?.startsWith("v2_")) {
    await reconcileV2();
    return { handled: true, product: "commercial_v2" };
  }
  if (mpSubscription.external_reference?.startsWith("legacy_plus_")) {
    const operation = await prisma.commercialBillingOperation.findFirstOrThrow({where: {id: mpSubscription.external_reference.slice(12), provider: "MERCADO_PAGO"}});
    await reconcileLegacyPlusOperation(operation.businessId, operation.id);
  }

  if (await syncMercadoPagoWebsitePreapproval(mpSubscription)) return { handled: true, product: "website" };

  const subscription = await prisma.subscription.findFirst({
    where: { mpSubscriptionId: mpSubscription.id },
  });
  if (!subscription) {
    return { handled: false, reason: "subscription_not_found" };
  }

  if (subscription.paymentMethod === "BANK_TRANSFER") {
    return { handled: false, reason: "manual_transfer_subscription" };
  }

  if (mpSubscription.status === "authorized") {
    // Preserve legitimate legacy grants without creating paid time from a
    // recurring authorization. Invoice reconciliation is the payment boundary.
    return { handled: true, state: subscription.status };
  }

  if (
    mpSubscription.status === "cancelled" ||
    mpSubscription.status === "canceled"
  ) {
    const nextState = stateForCancelledProviderSubscription(subscription);
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: nextState.status,
        isTrial: nextState.isTrial,
        ...(nextState.clearProviderIds
          ? { mpSubscriptionId: null, mpCustomerId: null }
          : {}),
      },
    });
    return { handled: true, state: nextState.status };
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

async function isV2Invoice(invoice: MercadoPagoInvoiceSnapshot) {
  if (process.env.PURAGENDA_MP_V2_ENVIRONMENT !== "production" || !invoice.preapproval_id) return false;
  return !!await prisma.commercialBillingOperation.findFirst({ where: {
    provider: "MERCADO_PAGO", environment: "V2_PRODUCTION", kind: "NEW_SUBSCRIPTION", providerSubscriptionId: invoice.preapproval_id,
    subscription: {legacySubscriptionId: null, termsSnapshot: {path: ["origin"], equals: "registration_v2"}},
  }, select: { id: true } });
}

async function processPaymentNotification(resourceId: string, reconcileV2: () => Promise<void>) {
  const paymentId = Number(resourceId);
  if (!Number.isFinite(paymentId)) {
    return { handled: false, reason: "invalid_payment_id" };
  }

  const invoice = await getMercadoPagoInvoiceByPaymentId(paymentId);

  if (!invoice) {
    // The payment may belong to deposits or another integration.
    return { handled: false, reason: "subscription_invoice_not_found" };
  }

  if (await reconcileLegacyPlusInvoice(invoice)) return {handled: true, product: "legacy_plus"};
  if (await isV2Invoice(invoice)) {
    await reconcileV2();
    return { handled: true, product: "commercial_v2" };
  }

  if (await syncMercadoPagoWebsiteInvoice(invoice)) return { handled: true, product: "website" };
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

    const bodyDataId = (body.data as Record<string, unknown> | undefined)?.id;
    const queryDataId =
      request.nextUrl.searchParams.get("data.id") ??
      request.nextUrl.searchParams.get("data_id");
    const resourceId =
      queryDataId ??
      (typeof bodyDataId === "string" || typeof bodyDataId === "number"
        ? String(bodyDataId)
        : undefined);

    const signature = verifyMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId: queryDataId ?? resourceId ?? null,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
    });

    if (!signature.valid) {
      console.error("[webhook/mp] Invalid webhook signature", {
        reason: signature.reason,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const notificationType =
      request.nextUrl.searchParams.get("type") ??
      (body.type as string | undefined);
    if (!notificationType || !resourceId) {
      return NextResponse.json({ received: true });
    }

    // The current application-level callback remains valid for recurring V2
    // contracts. The V2 reconciler verifies its own signature, account,
    // application, environment and durable operation before granting access.
    const reconcileV2 = () => handleMpV2Webhook(rawBody, request.headers, queryDataId ?? null);

    if (notificationType === "subscription_authorized_payment") {
      const invoiceClient = new Invoice(mpClient);
      const invoice = (await invoiceClient.get({
        id: resourceId,
      })) as MercadoPagoInvoiceSnapshot;
      const result = await reconcileLegacyPlusInvoice(invoice) ? {handled: true, product: "legacy_plus"}
        : await isV2Invoice(invoice) ? (await reconcileV2(), { handled: true, product: "commercial_v2" })
        : await syncMercadoPagoWebsiteInvoice(invoice) ? { handled: true, product: "website" } : await processMercadoPagoInvoice(invoice);
      return NextResponse.json({ received: true, result });
    }

    if (notificationType === "subscription_preapproval") {
      const result = await processPreapproval(resourceId, reconcileV2);
      return NextResponse.json({ received: true, result });
    }

    if (notificationType === "payment") {
      const result = await processPaymentNotification(resourceId, reconcileV2);
      return NextResponse.json({ received: true, result });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // Return a retryable status: losing billing notifications is worse than a
    // duplicate because invoice processing is idempotent by invoice/payment ID.
    console.error("[webhook/mp] Error processing notification", { kind: error instanceof Error ? error.name : "ProviderError" });
    return NextResponse.json(
      { received: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
