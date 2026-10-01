import { WebsiteError } from "@/server/websites/errors";
import { Environment } from "@paddle/paddle-node-sdk";
import type { EventEntity, SubscriptionNotification } from "@paddle/paddle-node-sdk";
import { prisma } from "@/server/db/prisma";
import { getPaddleEnvironment, getPaddleServerClient } from "@/server/lib/paddle";
import { requireWebsiteManager } from "./service";
import { hasWebsiteEntitlement } from "@/websites/policy";

function sandboxClient() {
  if (getPaddleEnvironment() !== Environment.sandbox) throw new WebsiteError("El add-on está habilitado solo en sandbox durante esta fase");
  const key = process.env.PADDLE_API_KEY || process.env.PADDLE_SANDBOX_API_KEY || "";
  if (!key.includes("sdbx")) throw new WebsiteError("Configura una clave sandbox para el add-on");
  return getPaddleServerClient();
}
export async function websitePrice() {
  const id = process.env.PADDLE_WEBSITE_PRICE_ID?.trim();
  if (!id) return null;
  const price = await sandboxClient().prices.get(id);
  if (price.status !== "active" || price.billingCycle?.interval !== "month" || price.billingCycle.frequency !== 1) throw new WebsiteError("El catálogo Website debe tener un precio mensual activo");
  return { id: price.id, amount: price.unitPrice.amount, currency: price.unitPrice.currencyCode };
}
export async function startWebsiteCheckout() {
  const { business } = await requireWebsiteManager(true);
  const price = await websitePrice(); if (!price) throw new WebsiteError("El catálogo sandbox de Sitio Web aún no está configurado");
  const client = sandboxClient();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    const addon = await tx.websiteAddon.findUnique({ where: { businessId: business.id } });
    if (hasWebsiteEntitlement(addon) || addon?.paddleSubscriptionId && !["CANCELLED", "INACTIVE"].includes(addon.status)) throw new WebsiteError("Ya existe un add-on. Reactívalo o regulariza su pago.");
    if (addon?.checkoutTransactionId) {
      const existing = await client.transactions.get(addon.checkoutTransactionId);
      if (["draft", "ready"].includes(existing.status)) return { transactionId: existing.id };
      const terminated = addon.status === "CANCELLED" && existing.subscriptionId === addon.paddleSubscriptionId;
      if (existing.status !== "canceled" && !terminated) throw new WebsiteError("Hay un checkout en proceso. Espera la confirmación de billing.");
    }
    const transaction = await client.transactions.create({ items: [{ priceId: price.id, quantity: 1 }], customData: { puragenda_business_id: business.id, puragenda_addon: "website" }, checkout: { url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/website` } });
    await tx.websiteAddon.upsert({ where: { businessId: business.id }, create: { businessId: business.id, checkoutTransactionId: transaction.id }, update: { checkoutTransactionId: transaction.id } });
    return { transactionId: transaction.id };
  }, { timeout: 30000 });
}
export async function changeWebsiteBilling(operation: "cancel" | "reactivate", confirmed: boolean) {
  if (!confirmed) throw new WebsiteError("Confirma el cambio del add-on");
  const { business } = await requireWebsiteManager(true);
  const addon = await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: business.id } });
  if (!addon.paddleSubscriptionId || addon.provider !== "paddle") throw new WebsiteError("No hay una suscripción Paddle del add-on");
  const client = sandboxClient();
  if (operation === "cancel") await client.subscriptions.cancel(addon.paddleSubscriptionId, { effectiveFrom: "next_billing_period" });
  else {
    if (addon.status === "CANCELLED" || !addon.cancelAt) throw new WebsiteError("Una suscripción terminada requiere un nuevo checkout");
    await client.subscriptions.update(addon.paddleSubscriptionId, { scheduledChange: null });
  }
  // Verified webhook, not action success, owns entitlement.
}
export async function recoverWebsitePayment() {
  const { business } = await requireWebsiteManager(true);
  const addon = await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: business.id } });
  if (addon.provider !== "paddle" || addon.status !== "PAST_DUE" || !addon.paddleSubscriptionId) throw new WebsiteError("No existe un pago pendiente del add-on");
  const transaction = await sandboxClient().subscriptions.getPaymentMethodChangeTransaction(addon.paddleSubscriptionId);
  return { transactionId: transaction.id };
}
export async function syncWebsiteAddon(event: EventEntity) {
  const sub = event.data as SubscriptionNotification;
  const custom = sub.customData as Record<string, unknown> | null;
  if (custom?.puragenda_addon !== "website") return false;
  // Add-on transaction events must never activate/change the base subscription.
  // Only the verified recurring subscription state owns website entitlement.
  if (!event.eventType.startsWith("subscription.")) return true;
  const businessId = custom.puragenda_business_id;
  if (typeof businessId !== "string" || !businessId || !process.env.PADDLE_WEBSITE_PRICE_ID) return true;
  const priceId = process.env.PADDLE_WEBSITE_PRICE_ID;
  if (getPaddleEnvironment() !== Environment.sandbox) return true;
  const occurredAt = new Date(event.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) throw new WebsiteError("Fecha de evento inválida");
  await prisma.$transaction(async tx => {
    // Lock by business, including first event; serialize out-of-order/concurrent
    // deliveries and checkout retries before pinning provider subscription ID.
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${businessId} FOR UPDATE`;
    const business = await tx.business.findUnique({ where: { id: businessId }, select: { id: true, deletedAt: true } });
    if (!business || business.deletedAt) return;
    if (await tx.websiteBillingEvent.findUnique({ where: { eventId: event.eventId } })) return;
    const old = await tx.websiteAddon.findUnique({ where: { businessId } });
    if (old?.lastEventAt && old.lastEventAt >= occurredAt) return;
    if (old?.paddleSubscriptionId && old.paddleSubscriptionId !== sub.id && old.status !== "CANCELLED") throw new WebsiteError("Suscripción de add-on distinta a la existente");
    if (old?.paddleSubscriptionId !== sub.id) {
      // custom_data is not ownership proof. Bind the first delivery to the
      // transaction created server-side after owner authentication. This also
      // handles activation delivered before subscription.created.
      if (!old?.checkoutTransactionId) throw new WebsiteError("No existe un checkout autorizado para este negocio");
      const transactionId = "transactionId" in sub ? sub.transactionId : null;
      if (transactionId) {
        if (transactionId !== old.checkoutTransactionId) throw new WebsiteError("El checkout no corresponde al negocio");
      } else {
        const transaction = await sandboxClient().transactions.get(old.checkoutTransactionId);
        if (transaction.subscriptionId !== sub.id) throw new WebsiteError("La suscripción no corresponde al checkout autorizado");
      }
    }
    const item = sub.items.find(item => item.price?.id === priceId);
    const status = !item ? "INACTIVE" : sub.status === "active" ? "ACTIVE" : sub.status === "trialing" ? "TRIALING" : sub.status === "past_due" ? "PAST_DUE" : sub.status === "canceled" ? "CANCELLED" : "INACTIVE";
    const periodEnd = sub.currentBillingPeriod?.endsAt ?? (status === "TRIALING" ? sub.nextBilledAt : null);
    const data = { status: status as "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELLED" | "INACTIVE", provider: "paddle", paddleSubscriptionId: sub.id, paddleCustomerId: sub.customerId, paddlePriceId: item?.price?.id ?? null, validUntil: periodEnd ? new Date(periodEnd) : null, cancelAt: sub.scheduledChange?.action === "cancel" ? new Date(sub.scheduledChange.effectiveAt) : null, lastEventAt: occurredAt, lastEventId: event.eventId };
    await tx.websiteAddon.upsert({ where: { businessId }, create: { businessId, ...data }, update: data });
    await tx.websiteBillingEvent.create({ data: { eventId: event.eventId } });
    // Retain snapshots. Suspension is reversible with an explicit publication.
    if (!["ACTIVE", "TRIALING"].includes(status)) await tx.businessWebsite.updateMany({ where: { businessId, status: "PUBLISHED" }, data: { status: "SUSPENDED" } });
  }, { timeout: 30000 });
  return true;
}
