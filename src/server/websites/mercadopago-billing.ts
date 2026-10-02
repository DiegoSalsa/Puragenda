import { randomUUID } from "node:crypto";
import { addMonths } from "date-fns";
import { PreApproval, Payment } from "mercadopago";
import type { PreApprovalResponse, PreApprovalRequest } from "mercadopago/dist/clients/preApproval/commonTypes";
import type { WebsiteCheckoutOperation } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { mpClient } from "@/server/lib/mercadopago";
import { requireWebsiteManager } from "./service";
import { WebsiteError } from "./errors";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { hasWebsiteTrial, WEBSITE_CATALOG, websitePriceTier } from "@/websites/offers";
import { hasWebsitePaidAccess } from "@/websites/policy";
import type { MercadoPagoInvoiceSnapshot } from "@/server/services/subscription-dunning.service";

export function websiteBillingSimulatorEnabled() {
  try {
    const url = new URL(process.env.DATABASE_URL || "");
    return process.env.NODE_ENV !== "production" && process.env.WEBSITE_QA === "1" && process.env.WEBSITE_BILLING_SIMULATOR === "1" && ["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "55439" && url.pathname === "/websiteqa";
  } catch { return false; }
}
export function requireWebsiteAcquisition() {
  if (process.env.WEBSITE_CHECKOUT_ENABLED !== "1") throw new WebsiteError("Las nuevas activaciones están temporalmente pausadas. Tu contenido sigue guardado.");
}
async function requireOperationalBase(businessId: string) {
  const base = await prisma.subscription.findUnique({ where: { businessId } });
  if (!hasOperationalSubscriptionAccess(base)) throw new WebsiteError("Regulariza tu plan Puragenda antes de activar Sitio Web.");
}
function configuredClient() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN || !process.env.MERCADOPAGO_WEBHOOK_SECRET) throw new WebsiteError("Mercado Pago aún no está configurado para Sitio Web.");
  return new PreApproval(mpClient);
}
function validDate(raw?: string | null) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}
function checkoutUrl(raw?: string) {
  if (!raw) throw new WebsiteError("Mercado Pago no devolvió un enlace de pago.");
  const url = new URL(raw);
  if (url.protocol !== "https:" || !/^([a-z0-9-]+\.)*mercadopago\.(cl|com|com\.ar)$/.test(url.hostname)) throw new WebsiteError("Enlace de pago inválido.");
  return url.toString();
}
export function websitePreapprovalBody(op: Pick<WebsiteCheckoutOperation, "id" | "amount" | "currency" | "firstChargeAt">, email: string, appUrl: string): PreApprovalRequest {
  const url = new URL(appUrl);
  if (url.protocol !== "https:" && !websiteBillingSimulatorEnabled()) throw new WebsiteError("Sitio Web requiere una URL pública HTTPS para Mercado Pago.");
  return { reason: "Sitio Web Puragenda", external_reference: `website:${op.id}`, payer_email: email, status: "pending", back_url: `${url.origin}/dashboard/website?website_payment=returned`, auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: op.amount, currency_id: op.currency, ...(op.firstChargeAt ? { start_date: op.firstChargeAt.toISOString() } : {}) } };
}
function simulatedPreapproval(op: WebsiteCheckoutOperation): PreApprovalResponse {
  return { id: op.mpSubscriptionId || `MP-WEB-SIM-${op.id}`, external_reference: `website:${op.id}`, status: op.providerStatus || "pending", last_modified: op.updatedAt.toISOString(), payer_id: 1, auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: op.amount, currency_id: op.currency }, next_payment_date: op.firstChargeAt?.toISOString(), init_point: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"}/dashboard/website/payment-simulator?operation=${op.id}` } as PreApprovalResponse;
}
export async function fetchWebsitePreapproval(id: string) {
  if (!websiteBillingSimulatorEnabled()) return configuredClient().get({ id });
  const op = await prisma.websiteCheckoutOperation.findUniqueOrThrow({ where: { mpSubscriptionId: id } });
  return simulatedPreapproval(op);
}
export async function startMercadoPagoWebsiteCheckout() {
  requireWebsiteAcquisition();
  const { business, user } = await requireWebsiteManager(true);
  if (business.countryCode !== "CL") throw new WebsiteError("Mercado Pago Sitio Web está disponible para Chile.");
  await requireOperationalBase(business.id);
  if (!websiteBillingSimulatorEnabled()) configuredClient();
  // Validate public configuration before persisting a provider operation.
  websitePreapprovalBody({ id: "configuration-check", amount: 1, currency: "CLP", firstChargeAt: null }, user.email, process.env.NEXT_PUBLIC_APP_URL || "");
  const claim = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
    const offer = await tx.websiteOfferEligibility.findUnique({ where: { businessId: business.id } });
    const tier = websitePriceTier(offer);
    let addon = await tx.websiteAddon.findUnique({ where: { businessId: business.id } });
    if (addon?.status === "ACTIVE" && addon.validUntil && addon.validUntil > new Date() && !addon.cancelAt) throw new WebsiteError("Tu Sitio Web ya está activo.");
    if (addon?.paddleSubscriptionId && addon.status !== "CANCELLED") throw new WebsiteError("Regulariza la suscripción Website existente antes de cambiar de proveedor.");
    if (!addon) addon = await tx.websiteAddon.create({ data: { businessId: business.id, provider: "mercadopago" } });
    const existing = await tx.websiteCheckoutOperation.findFirst({ where: { addonId: addon.id, state: { in: ["CREATING", "UNKNOWN", "PENDING", "AUTHORIZED"] } }, orderBy: { createdAt: "desc" } });
    if (existing) return { op: existing, create: false };
    const firstChargeAt = hasWebsiteTrial(offer) ? new Date(offer!.trialEndsAt!) : addon.cancelAt && hasWebsitePaidAccess(addon) ? addon.validUntil : null;
    const op = await tx.websiteCheckoutOperation.create({ data: { id: randomUUID(), addonId: addon.id, priceTier: tier, amount: Number(WEBSITE_CATALOG[tier].amount), firstChargeAt, expiresAt: new Date(Date.now() + 24 * 3600000) } });
    return { op, create: true };
  });
  let op = claim.op;
  if (!claim.create && (op.state === "CREATING" || op.state === "UNKNOWN")) throw new WebsiteError("Estamos conciliando tu solicitud de pago. No se creará otra suscripción; contacta a soporte si continúa pendiente.");
  if (!claim.create && op.mpSubscriptionId) {
    await syncMercadoPagoWebsitePreapproval(await fetchWebsitePreapproval(op.mpSubscriptionId));
    op = await prisma.websiteCheckoutOperation.findUniqueOrThrow({ where: { id: op.id } });
    if (op.state === "CANCELLED") return startMercadoPagoWebsiteCheckout();
    if (op.state === "AUTHORIZED") throw new WebsiteError("Estamos esperando la confirmación de Mercado Pago. Tu acuerdo ya fue autorizado.");
    // Pending provider agreements do not have a documented TTL. Never abandon
    // one locally and create another while it could still be authorized.
    if (op.expiresAt <= new Date()) throw new WebsiteError("Este enlace venció. Cancela la solicitud pendiente antes de iniciar un nuevo pago.");
  }
  if (claim.create) {
    try {
      const body = websitePreapprovalBody(op, user.email, process.env.NEXT_PUBLIC_APP_URL || "");
      const provider = websiteBillingSimulatorEnabled() ? simulatedPreapproval(op) : await configuredClient().create({ body, requestOptions: { idempotencyKey: op.id } });
      if (!provider.id || provider.external_reference !== body.external_reference) throw new WebsiteError("Mercado Pago no confirmó la referencia del checkout.");
      const url = websiteBillingSimulatorEnabled() ? provider.init_point! : checkoutUrl(provider.init_point);
      op = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
        const updated = await tx.websiteCheckoutOperation.update({ where: { id: op.id }, data: { state: "PENDING", mpSubscriptionId: provider.id, checkoutUrl: url, providerStatus: provider.status || "pending" } });
        await tx.websiteAddon.update({ where: { businessId: business.id }, data: { provider: "mercadopago", mpSubscriptionId: provider.id, mpCustomerId: provider.payer_id ? String(provider.payer_id) : null, lastEventAt: null, lastEventId: null } });
        await tx.websiteCommercialEvent.create({ data: { key: `checkout:${op.id}`, businessId: business.id, event: op.priceTier === "BETA_FOUNDER" ? "website_beta_checkout_started" : "website_standard_checkout_started", priceTier: op.priceTier } });
        return updated;
      });
    } catch {
      // Persist ambiguity even after timeout/crash. Retrying an unknown POST
      // could create duplicate recurring debits if provider idempotency differs.
      await prisma.websiteCheckoutOperation.update({ where: { id: op.id }, data: { state: "UNKNOWN" } });
      throw new WebsiteError("No pudimos confirmar el checkout. Soporte debe conciliar la solicitud antes de reintentar.");
    }
  }
  return { provider: "mercadopago" as const, checkoutUrl: op.checkoutUrl!, firstChargeAt: op.firstChargeAt?.toISOString() ?? null };
}

// Call only with a server-fetched provider resource; webhook caller validates
// signature before fetching it. No payload metadata is accepted as ownership.
export async function syncMercadoPagoWebsitePreapproval(sub: PreApprovalResponse) {
  if (!sub.id) return false;
  const op = await prisma.websiteCheckoutOperation.findUnique({ where: { mpSubscriptionId: sub.id }, include: { addon: true } });
  if (!op) {
    if (sub.external_reference?.startsWith("website:")) throw new WebsiteError("Checkout Website pendiente de conciliación.");
    return false;
  }
  const occurredAt = validDate(sub.last_modified);
  const recurring = sub.auto_recurring;
  if (!occurredAt || sub.external_reference !== `website:${op.id}` || recurring?.transaction_amount !== op.amount || recurring.currency_id !== op.currency || recurring.frequency !== 1 || recurring.frequency_type !== "months") throw new WebsiteError("La suscripción no corresponde a la operación Website.");
  if (op.firstChargeAt && sub.next_payment_date && new Date(sub.next_payment_date) < op.firstChargeAt && !op.addon.validUntil) throw new WebsiteError("Mercado Pago adelantó el primer cobro respecto del trial.");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${op.addon.businessId} FOR UPDATE`;
    const old = await tx.websiteAddon.findUniqueOrThrow({ where: { id: op.addonId } });
    if (old.mpSubscriptionId !== sub.id || old.lastEventAt && old.lastEventAt > occurredAt) return;
    const eventId = `mp:preapproval:${sub.id}:${occurredAt.toISOString()}`;
    if (await tx.websiteBillingEvent.findUnique({ where: { eventId } })) return;
    const cancelled = ["cancelled", "canceled"].includes(sub.status || "");
    const state = cancelled ? "CANCELLED" : sub.status === "authorized" ? "AUTHORIZED" : "PENDING";
    await tx.websiteCheckoutOperation.update({ where: { id: op.id }, data: { state, providerStatus: sub.status } });
    const paid = hasWebsitePaidAccess(old);
    // Agreement authorization cannot activate an unpaid add-on or clear dunning.
    const status = cancelled ? paid ? "ACTIVE" : "CANCELLED" : sub.status === "paused" ? "PAST_DUE" : old.status;
    await tx.websiteAddon.update({ where: { id: old.id }, data: { status, ...(cancelled ? { cancelAt: paid ? old.cancelAt || old.validUntil : new Date() } : {}), lastEventAt: occurredAt, lastEventId: eventId } });
    if (cancelled && !old.cancelAt) await tx.websiteCommercialEvent.create({ data: { key: eventId, businessId: old.businessId, event: "website_addon_cancelled", priceTier: op.priceTier } });
    await tx.websiteBillingEvent.create({ data: { eventId } });
  });
  return true;
}
export async function syncMercadoPagoWebsiteInvoice(invoice: MercadoPagoInvoiceSnapshot) {
  if (!invoice.preapproval_id) return false;
  const op = await prisma.websiteCheckoutOperation.findUnique({ where: { mpSubscriptionId: invoice.preapproval_id }, include: { addon: true } });
  if (!op) return false;
  if (invoice.transaction_amount !== op.amount || invoice.currency_id !== op.currency || !invoice.id) throw new WebsiteError("Monto o moneda Website incorrectos.");
  const sub = await fetchWebsitePreapproval(invoice.preapproval_id);
  if (sub.external_reference !== `website:${op.id}` || sub.auto_recurring?.transaction_amount !== op.amount || sub.auto_recurring.currency_id !== op.currency) throw new WebsiteError("La factura no corresponde al checkout.");
  const occurredAt = validDate(invoice.last_modified);
  const debitAt = validDate(invoice.debit_date);
  if (!occurredAt || !debitAt) throw new WebsiteError("Factura sin fechas verificables.");
  let paymentStatus = invoice.payment?.status;
  if (!websiteBillingSimulatorEnabled() && invoice.payment?.id) {
    const payment = await new Payment(mpClient).get({ id: invoice.payment.id });
    if (String(payment.id) !== String(invoice.payment.id) || payment.transaction_amount !== op.amount || payment.currency_id !== op.currency) throw new WebsiteError("El pago Website no coincide con la factura.");
    paymentStatus = payment.status;
  }
  const approved = paymentStatus === "approved" && !!invoice.payment?.id;
  if (approved && op.firstChargeAt && debitAt < op.firstChargeAt) throw new WebsiteError("Cobro Website anterior al fin del trial.");
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Business" WHERE id = ${op.addon.businessId} FOR UPDATE`;
    const old = await tx.websiteAddon.findUniqueOrThrow({ where: { id: op.addonId } });
    const eventId = `mp:invoice:${invoice.id}:${paymentStatus || invoice.status}:${occurredAt.toISOString()}`;
    if (old.mpSubscriptionId !== invoice.preapproval_id || old.lastEventAt && old.lastEventAt > occurredAt || await tx.websiteBillingEvent.findUnique({ where: { eventId } })) return;
    const rejected = ["rejected", "cancelled", "canceled", "refunded", "charged_back"].includes(paymentStatus || "") || invoice.status === "recycling";
    const end = approved ? addMonths(debitAt, 1) : old.validUntil;
    const cancelled = ["cancelled", "canceled"].includes(sub.status || "");
    const status = approved ? "ACTIVE" : rejected ? "PAST_DUE" : old.status;
    await tx.websiteAddon.update({ where: { id: old.id }, data: { status, validUntil: end && (!old.validUntil || end > old.validUntil) ? end : old.validUntil, cancelAt: approved && !cancelled ? null : old.cancelAt, lastEventAt: occurredAt, lastEventId: eventId } });
    if (approved && old.status !== "ACTIVE") {
      const name = old.cancelAt || old.status === "CANCELLED" ? "website_addon_reactivated" : op.priceTier === "BETA_FOUNDER" ? "website_beta_activated" : "website_standard_activated";
      await tx.websiteCommercialEvent.create({ data: { key: eventId, businessId: old.businessId, event: name, priceTier: op.priceTier } });
    }
    await tx.websiteBillingEvent.create({ data: { eventId } });
  });
  return true;
}
export async function changeMercadoPagoWebsiteBilling(operation: "cancel" | "reactivate", confirmed: boolean) {
  if (!confirmed) throw new WebsiteError("Confirma el cambio del add-on.");
  const { business } = await requireWebsiteManager(true);
  const addon = await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: business.id } });
  if (addon.provider !== "mercadopago" || !addon.mpSubscriptionId) throw new WebsiteError("No hay una suscripción Mercado Pago de Sitio Web.");
  const sub = await fetchWebsitePreapproval(addon.mpSubscriptionId);
  if (operation === "reactivate") {
    requireWebsiteAcquisition();
    await requireOperationalBase(business.id);
    if (["cancelled", "canceled"].includes(sub.status || "")) return startMercadoPagoWebsiteCheckout();
    if (sub.status !== "paused") throw new WebsiteError("Tu acuerdo sigue vigente; no requiere reactivación.");
  }
  if (websiteBillingSimulatorEnabled()) {
    await prisma.websiteCheckoutOperation.update({ where: { mpSubscriptionId: addon.mpSubscriptionId }, data: { providerStatus: operation === "cancel" ? "cancelled" : "authorized" } });
  } else await configuredClient().update({ id: addon.mpSubscriptionId, body: { status: operation === "cancel" ? "cancelled" : "authorized" } });
  await syncMercadoPagoWebsitePreapproval(await fetchWebsitePreapproval(addon.mpSubscriptionId));
}
export async function recoverMercadoPagoWebsitePayment() {
  requireWebsiteAcquisition();
  const { business } = await requireWebsiteManager(true);
  const addon = await prisma.websiteAddon.findUniqueOrThrow({ where: { businessId: business.id } });
  if (!addon.mpSubscriptionId) return startMercadoPagoWebsiteCheckout();
  await syncMercadoPagoWebsitePreapproval(await fetchWebsitePreapproval(addon.mpSubscriptionId));
  // MP hosted subscriptions have no documented payment-method recovery link.
  // Cancel the failed recurring agreement, preserve paid period, then create one.
  await changeMercadoPagoWebsiteBilling("cancel", true);
  return startMercadoPagoWebsiteCheckout();
}
