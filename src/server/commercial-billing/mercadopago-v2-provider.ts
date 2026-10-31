import { Invoice, MercadoPagoConfig, Payment, PreApproval, Preference, User } from "mercadopago";
import { z } from "zod";
import { createHash } from "node:crypto";
import { verifyMercadoPagoWebhookSignature } from "@/server/lib/mercadopago-webhook";
import { commercialHash } from "@/server/services/commercial-internal";

const id = z.union([z.string(), z.number()]).transform(String);
const date = z.coerce.date();
const amount = z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const mpV2SubscriptionSchema = z.object({ id, status: z.string(), collector_id: z.number(), application_id: z.number().optional(),
  external_reference: z.string(), live_mode: z.boolean().optional(), init_point: z.string().optional(), next_payment_date: date.nullish(),
  auto_recurring: z.object({ frequency: z.number().int(), frequency_type: z.literal("months"), transaction_amount: amount, currency_id: z.literal("CLP"), start_date: date.optional() }) });
export const mpV2PaymentSchema = z.object({ id, status: z.string(), live_mode: z.boolean(), collector_id: z.number(),
  currency_id: z.literal("CLP"), transaction_amount: amount, external_reference: z.string().nullish(),
  transaction_amount_refunded: amount.default(0), status_detail:z.string().nullish(),
  date_approved: date.nullish(), date_last_updated: date }).refine(payment=>payment.transaction_amount_refunded<=payment.transaction_amount,{message:"Refund cannot exceed the canonical gross amount"});
export const mpV2InvoiceSchema = z.object({ id, preapproval_id: z.string(), debit_date: date,
  currency_id: z.literal("CLP"), transaction_amount: amount, payment: z.object({ id: id.nullish() }).nullish() });
export type MpV2Subscription = z.infer<typeof mpV2SubscriptionSchema>;
export type MpV2Payment = z.infer<typeof mpV2PaymentSchema>;
export type MpV2Invoice = z.infer<typeof mpV2InvoiceSchema>;
export type MpV2Environment = "V2_SANDBOX" | "V2_PRODUCTION";
export type MpV2Config = { environment: MpV2Environment; accountId: number; applicationId: number; token: string; secret: string; returnUrl: string; webhookUrl: string; sandboxAccountLiveMode?: boolean };
// Non-secret identity from the official sandbox acceptance run. Extending this
// exception to another seller requires an explicit, reviewed identity change.
export const MP_V2_APPROVED_TEST_IDENTITY = Object.freeze({ accountId: 3468148589, applicationId: 1712173371015642 });
function assertSandboxLiveModeIdentity(config: Pick<MpV2Config, "environment" | "accountId" | "applicationId" | "sandboxAccountLiveMode">) {
  if (config.sandboxAccountLiveMode && (config.environment !== "V2_SANDBOX" || config.accountId !== MP_V2_APPROVED_TEST_IDENTITY.accountId || config.applicationId !== MP_V2_APPROVED_TEST_IDENTITY.applicationId)) throw new Error("V2_UNAPPROVED_SANDBOX_LIVE_MODE");
}
export function mpV2Configuration(): MpV2Config {
  if (process.env.PURAGENDA_MP_V2_ENABLED !== "1") throw new Error("V2_BILLING_DISABLED");
  const environment = process.env.PURAGENDA_MP_V2_ENVIRONMENT ?? "sandbox";
  if (!["sandbox", "production"].includes(environment)) throw new Error("V2_BILLING_ENVIRONMENT_INVALID");
  const live = environment === "production";
  if (live && process.env.PURAGENDA_MP_V2_PRODUCTION_WRITES !== "1") throw new Error("V2_PRODUCTION_WRITES_DISABLED");
  if (!live) {
    const rawDatabase = process.env.DATABASE_URL ?? "";
    let localTestDatabase = false;
    try { const database = new URL(rawDatabase); localTestDatabase = ["127.0.0.1", "localhost"].includes(database.hostname) && /^\/puragenda_commercial_test(?:_[a-z0-9]+)?$/.test(database.pathname); } catch { /* fail closed */ }
    const approvedHash = process.env.PURAGENDA_MP_V2_SANDBOX_DATABASE_SHA256;
    if (!localTestDatabase && (!approvedHash || !rawDatabase || approvedHash !== createHash("sha256").update(rawDatabase).digest("hex"))) throw new Error("V2_SANDBOX_DATABASE_REQUIRED");
  }
  const prefix = `PURAGENDA_MP_V2_${live ? "PRODUCTION" : "SANDBOX"}_`;
  const accountId = Number(process.env[`${prefix}ACCOUNT_ID`]), applicationId = Number(process.env[`${prefix}APPLICATION_ID`]);
  const token = process.env[`${prefix}ACCESS_TOKEN`] ?? "", secret = process.env[`${prefix}WEBHOOK_SECRET`] ?? "";
  if (!token || !secret || !Number.isSafeInteger(accountId) || accountId <= 0 || !Number.isSafeInteger(applicationId) || applicationId <= 0) throw new Error("V2_BILLING_CONFIGURATION_REQUIRED");
  const base = new URL(process.env.PURAGENDA_MP_V2_APP_URL ?? "");
  if (base.username || base.password || base.search || base.hash || base.pathname !== "/" ||
    (base.protocol !== "https:" && !(base.protocol === "http:" && !live && ["localhost", "127.0.0.1"].includes(base.hostname)))) throw new Error("V2_BILLING_URL_INVALID");
  const sandboxMode = process.env.PURAGENDA_MP_V2_SANDBOX_ACCOUNT_LIVE_MODE ?? "0";
  if (!["0", "1"].includes(sandboxMode)) throw new Error("V2_SANDBOX_ACCOUNT_MODE_INVALID");
  const config: MpV2Config = { environment: live ? "V2_PRODUCTION" : "V2_SANDBOX", accountId, applicationId, token, secret, sandboxAccountLiveMode: !live && sandboxMode === "1",
    returnUrl: new URL("/dashboard/settings?billing_return=1#plan", base).href,
    webhookUrl: new URL("/api/webhooks/mercadopago-v2", base).href };
  assertSandboxLiveModeIdentity(config);
  return config;
}
export type MpV2Port = {
  account(): Promise<unknown>; subscription(id: string): Promise<unknown>;
  create(body: Parameters<PreApproval["create"]>[0]["body"], key: string): Promise<unknown>;
  update(id: string, body: Parameters<PreApproval["update"]>[0]["body"]): Promise<unknown>;
  search(reference: string): Promise<unknown>; invoice(id: string): Promise<unknown>; invoices(subscriptionId: string, offset?: number): Promise<unknown>;
  invoicesForPayment(id: string): Promise<unknown>; payment(id: string): Promise<unknown>;
  preference(body: Parameters<Preference["create"]>[0]["body"], key: string): Promise<unknown>;
  payments(reference: string): Promise<unknown>;
};
export class MpV2Provider {
  private verifiedTestAccount = false;
  constructor(readonly config: MpV2Config, readonly port: MpV2Port) { assertSandboxLiveModeIdentity(config); }
  private get expectedLiveMode() { return this.config.environment === "V2_PRODUCTION" || this.config.sandboxAccountLiveMode === true; }
  async checkAccount() {
    this.verifiedTestAccount = false;
    const account = z.object({ id: z.number(), site_id: z.literal("MLC"), tags: z.array(z.string()) }).parse(await this.port.account());
    if (account.id !== this.config.accountId || account.tags.includes("test_user") !== (this.config.environment === "V2_SANDBOX")) throw new Error("V2_PROVIDER_ACCOUNT_MISMATCH");
    this.verifiedTestAccount = this.config.environment === "V2_SANDBOX";
  }
  validateSubscription(value: unknown) {
    const sub = mpV2SubscriptionSchema.parse(value);
    if (sub.collector_id !== this.config.accountId || sub.application_id !== this.config.applicationId ||
      (this.config.sandboxAccountLiveMode && (!this.verifiedTestAccount || sub.application_id !== this.config.applicationId)) ||
      (sub.live_mode !== undefined && sub.live_mode !== this.expectedLiveMode)) throw new Error("V2_PROVIDER_ACCOUNT_MISMATCH");
    return sub;
  }
  async subscription(id: string) {
    if (this.config.sandboxAccountLiveMode) await this.checkAccount();
    const sub = this.validateSubscription(await this.port.subscription(id));
    if (sub.id !== id) throw new Error("V2_SUBSCRIPTION_ID_MISMATCH");
    return sub;
  }
  async payment(id: string) {
    // Test-user APP_USR credentials return live_mode=true, even for official test cards.
    // This explicit wire mode still requires the authenticated account's test_user tag.
    if (this.config.sandboxAccountLiveMode) await this.checkAccount();
    const payment = mpV2PaymentSchema.parse(await this.port.payment(id));
    if (payment.id !== id || payment.collector_id !== this.config.accountId || payment.live_mode !== this.expectedLiveMode) throw new Error("V2_PAYMENT_ACCOUNT_MISMATCH");
    return payment;
  }
  checkoutUrl(value: string, subscriptionId?: string) {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password || !["www.mercadopago.cl", "sandbox.mercadopago.cl"].includes(url.hostname) ||
      (subscriptionId ? url.pathname !== "/subscriptions/checkout" || url.searchParams.get("preapproval_id") !== subscriptionId : !url.pathname.startsWith("/checkout/"))) throw new Error("V2_CHECKOUT_URL_INVALID");
    return url.href;
  }
  async invoices(subscriptionId: string) {
    const invoices: MpV2Invoice[] = [];
    for (let page = 0; page < 20; page++) {
      const result = z.object({ results: z.array(z.unknown()), paging: z.object({ total: z.number() }).optional() }).parse(await this.port.invoices(subscriptionId, invoices.length));
      invoices.push(...result.results.map(row => mpV2InvoiceSchema.parse(row)));
      if (!result.paging || invoices.length >= result.paging.total) return invoices;
      if (!result.results.length) break;
    }
    throw new Error("V2_INVOICE_PAGINATION_INCOMPLETE");
  }
  verifyWebhook(raw: string, headers: Headers, queryId: string | null) {
    const payload = z.object({ id, type: z.enum(["payment", "subscription_preapproval", "subscription_authorized_payment"]), data: z.object({ id }), live_mode: z.boolean() }).parse(JSON.parse(raw));
    const ts = Number(headers.get("x-signature")?.match(/(?:^|,)\s*ts=(\d+)/)?.[1]);
    if (!queryId || queryId !== payload.data.id || !Number.isFinite(ts) || Math.abs(Date.now() - (ts < 1e12 ? ts * 1000 : ts)) > 300_000 ||
      payload.live_mode !== this.expectedLiveMode || !verifyMercadoPagoWebhookSignature({ xSignature: headers.get("x-signature"), xRequestId: headers.get("x-request-id"), dataId: queryId, secret: this.config.secret }).valid) throw new Error("V2_INVALID_WEBHOOK_SIGNATURE");
    return { id: payload.id, type: payload.type, resourceId: payload.data.id, hash: commercialHash(payload) };
  }
}
export function createMpV2Provider(settings: { timeoutMs?: number } = {}) {
  const config = mpV2Configuration();
  // A timed-out POST belongs to its durable operation; the SDK must not repeat it.
  const options = { timeout: settings.timeoutMs ?? 10_000, retries: 0 };
  const sdk = new MercadoPagoConfig({ accessToken: config.token, options });
  const subs = new PreApproval(sdk), invoice = new Invoice(sdk), payment = new Payment(sdk), preference = new Preference(sdk), user = new User(sdk);
  return new MpV2Provider(config, { account: () => user.get(), subscription: id => subs.get({ id }),
    create: (body, idempotencyKey) => subs.create({ body, requestOptions: { idempotencyKey } }), update: (id, body) => subs.update({ id, body }),
    search: external_reference => subs.search({ options: { external_reference } }), invoice: id => invoice.get({ id }),
    // Let this endpoint choose its supported page size; pagination uses actual results.
    invoices: (preapproval_id, offset = 0) => invoice.search({ options: { preapproval_id, offset } }),
    invoicesForPayment: payment_id => invoice.search({ options: { payment_id: Number(payment_id) } }), payment: id => payment.get({ id }),
    preference: (body, idempotencyKey) => preference.create({ body, requestOptions: { idempotencyKey } }),
    payments: external_reference => payment.search({ options: { external_reference, limit: 100 } }),
  });
}
