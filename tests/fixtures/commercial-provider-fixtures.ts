import { COMMERCIAL_CATALOG_VERSION, COMMERCIAL_PLAN_METADATA, quoteCommercialPlan } from "@/core/commercial-catalog";
import { createHmac, randomUUID } from "node:crypto";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { MercadoPagoSandboxAdapter, type MercadoPagoPort } from "@/server/commercial-billing/mercadopago-sandbox";
import { PaddleSandboxAdapter, type PaddlePort } from "@/server/commercial-billing/paddle-sandbox";
import { prepareCommercialBillingDraft } from "@/server/services/commercial-billing-adapter";
import type { BillingContext } from "@/server/commercial-billing/contracts";
export const webhookSecret = "fixture-webhook-secret-only";
export function mpSignature(body: string) {
  const id = String(JSON.parse(body).data.id).toLowerCase(); const ts = String(Date.now()); const request = "fixture-request";
  const value = createHmac("sha256", webhookSecret).update(`id:${id};request-id:${request};ts:${ts};`).digest("hex");
  return new Headers({ "x-signature": `ts=${ts},v1=${value}`, "x-request-id": request });
}
export function paddleSignature(body: string) {
  const ts = String(Math.floor(Date.now()/1000));
  return new Headers({ "paddle-signature": `ts=${ts};h1=${createHmac("sha256", webhookSecret).update(`${ts}:${body}`).digest("hex")}` });
}
export function mpNotification(id = "payment-fixture", type = "payment", resource = "101") {
  return JSON.stringify({ id, type, date_created: new Date().toISOString(), data: { id: resource } });
}
export function paddleNotification(id: string = randomUUID(), type = "transaction.completed", resource = `txn_${"1".repeat(26)}`) {
  return JSON.stringify({ event_id: id, event_type: type, occurred_at: new Date().toISOString(),
    notification_id: `ntf_${"1".repeat(26)}`, data: { id: resource, status: "completed", items: [], payments: [], totals: { subtotal: "1000", tax: "0", total: "1000", fee: "0", earnings: "1000", currency_code: "CLP" } } });
}
export function mpFixture(renewalValidated = false) {
  const state = { calls: 0, accountTags: ["test_user"], sub: { id: "fixture-mp-contract", status: "authorized", collector_id: 123,
    live_mode: false as const, external_reference: "previous", next_payment_date: new Date(Date.now()+86_400_000).toISOString(),
    auto_recurring: { transaction_amount: 12990, currency_id: "CLP", frequency: 1, frequency_type: "months" }, last_modified: new Date().toISOString() },
    payment: { id: 101, live_mode: false, collector_id: 123, status: "approved", transaction_amount: 12990,
      currency_id: "CLP", date_last_updated: new Date().toISOString(), date_approved: new Date().toISOString() },
    invoice: { id: 201, preapproval_id: "fixture-mp-contract", debit_date: new Date(Date.now()-1000).toISOString(), payment: { id: 101 } }, timeout: false };
  const port: MercadoPagoPort = { account: async () => ({ id:123, site_id: "MLC", tags: state.accountTags }),
    subscription: async () => state.sub, create: async body => {
      state.calls++; state.sub = { ...state.sub, external_reference: body.external_reference!, auto_recurring: body.auto_recurring as typeof state.sub.auto_recurring };
      if (state.timeout) throw new Error("fixture network timeout after remote acceptance"); return state.sub;
    }, update: async (_id, body) => { state.calls++; state.sub = { ...state.sub, status: body.status ?? state.sub.status,
      external_reference: body.external_reference ?? state.sub.external_reference, auto_recurring: { ...state.sub.auto_recurring, ...body.auto_recurring } }; return state.sub; },
    search: async () => ({ results: [state.sub] }), invoice: async () => state.invoice,
    invoicesForPayment: async () => ({ results: [state.invoice] }), payment: async () => state.payment };
  return { state, port, adapter: new MercadoPagoSandboxAdapter(port, 123, webhookSecret, "CONTRACT_FIXTURE", renewalValidated) };
}
const codes = ["PURAGENDA", "PURAGENDA_PLUS", "seats.2", "seats.3", "seats.4", "seats.5", "seats.6"];
export const paddlePriceMap = Object.fromEntries(codes.map((code,index) => [code, `pri_${String(index+1).padStart(26,"0")}`]));
const units = [COMMERCIAL_PLAN_METADATA.PURAGENDA.baseMonthly, COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly,
  ...quoteCommercialPlan({ catalogVersion: COMMERCIAL_CATALOG_VERSION, plan: "PURAGENDA", professionalTotal: 6 }).surchargeSteps.map(step => step.unitAmount)];
const total = (amount: number) => ({ grandTotal: String(amount), tax: "0", currencyCode: "CLP" });
export function paddleFixture(mode: "prorated_immediately" | "prorated_next_billing_period" = "prorated_immediately", renewalValidated = false) {
  const sdk = new Paddle("pdl_sdbx_apikey_fixture", { environment: Environment.sandbox });
  const subId = `sub_${"1".repeat(26)}`; const txnId = `txn_${"1".repeat(26)}`;
  const period = { startsAt: new Date(Date.now()-60_000).toISOString(), endsAt: new Date(Date.now()+30*86_400_000).toISOString() };
  const state = { calls: 0, timeout: false, immediate: 1000, recurring: Number(COMMERCIAL_PLAN_METADATA.PURAGENDA_PLUS.baseMonthly),
    subscription: { id: subId, status: "active", currencyCode: "CLP", customData: { puragendaSandbox: true } as Record<string, unknown>,
      scheduledChange: null, currentBillingPeriod: period, updatedAt: new Date().toISOString(), items: [{ price: { id: paddlePriceMap.PURAGENDA }, quantity:1 }] },
    transaction: { id: txnId, subscriptionId: subId as string | null, status: "completed", currencyCode: "CLP", customData: {} as Record<string,unknown>,
      billingPeriod: period, details: { totals: total(1000) }, updatedAt: new Date().toISOString() },
    adjustment: { action: "refund", status: "approved", transactionId: txnId, totals: { total: "1000" }, updatedAt: new Date().toISOString() },
    lastUpdate: null as unknown };
  const port: PaddlePort = { subscription: async () => state.subscription,
    price: async id => ({ id, status: "active", unitPrice: { amount:String(units[Object.values(paddlePriceMap).indexOf(id)]), currencyCode: "CLP" },
      billingCycle: { interval:"month", frequency:1 }, quantity: { minimum:1, maximum:10000 } }),
    preview: async (_id,payload) => { state.lastUpdate = payload; return { currencyCode:"CLP", immediateTransaction: mode === "prorated_next_billing_period" ? null : { details: { totals:total(state.immediate) } },
      recurringTransactionDetails: { totals:total(state.recurring) }, nextTransaction: { details: { totals:total(state.recurring) } } }; },
    previewNew: async () => ({ currencyCode:"CLP", details: { totals:total(state.recurring) } }),
    update: async (_id,payload) => { state.calls++; state.lastUpdate = payload;
      state.subscription.items = payload.items!.map(item => ({ price: { id:item.priceId! }, quantity:item.quantity! }));
      state.subscription.customData = payload.customData as Record<string, unknown>;
      if (state.timeout) throw new Error("fixture timeout after provider update"); return state.subscription; },
    create: async payload => { state.calls++; state.transaction.customData = payload.customData as Record<string,unknown>;
      state.subscription.customData = payload.customData as Record<string,unknown>;
      state.subscription.items = payload.items.map(item => ({ price: { id:item.priceId! }, quantity:item.quantity! }));
      if (state.timeout) throw new Error("fixture timeout after transaction create"); return { ...state.transaction, subscriptionId:null, status:"draft" }; },
    transaction: async () => state.transaction, adjustment: async () => state.adjustment,
    unmarshal: (body, secret, signature) => sdk.webhooks.unmarshal(body, secret, signature) };
  function bind(context: BillingContext, amount = state.immediate, when = new Date()) {
    const metadata = { puragendaSandbox:true, puragendaCommercialOperation:context.operationId, puragendaBusinessId:context.businessId };
    state.subscription.customData = metadata; state.transaction.customData = metadata;
    state.subscription.items = prepareCommercialBillingDraft(context.quote).lines.map(line => ({ price: { id:paddlePriceMap[line.code] }, quantity:line.quantity }));
    state.transaction.details.totals = total(amount); state.transaction.updatedAt = when.toISOString(); state.subscription.updatedAt = when.toISOString();
  }
  return { state, port, bind, adapter: new PaddleSandboxAdapter(port, paddlePriceMap, webhookSecret, "CONTRACT_FIXTURE", renewalValidated, mode) };
}
