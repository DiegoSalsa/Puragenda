import type { CommercialQuote } from "@/core/commercial-catalog";
import { z } from "zod";
export type BillingProvider = "MERCADO_PAGO" | "PADDLE";
export type BillingStrategy = "NEXT_RENEWAL" | "IMMEDIATE";
export type EvidenceOrigin = "SANDBOX_PROVIDER" | "CONTRACT_FIXTURE";
export type BillingContext = {
  operationId: string; businessId: string; quote: CommercialQuote;
  strategy: BillingStrategy; effectiveAt: Date; providerSubscriptionId: string | null;
};
export type ProviderPreview = {
  supported: boolean; blockers: string[]; currencyCode: string;
  immediateAmountMinor: number | null; expectedPaymentMinor: number | null;
  recurringAmountMinor: number | null; taxAmountMinor: number | null;
  items: { priceId: string; quantity: number }[];
  prorationMode: string | null; previewedAt: string;
};
export type ProviderResult = { providerSubscriptionId: string | null; providerOperationId: string; status: string };
export type VerifiedNotification = { eventId: string; type: string; occurredAt: Date; resourceId: string; rawHash: string };
export type ProviderObservation = {
  provider: BillingProvider; origin: EvidenceOrigin; providerSubscriptionId: string;
  operationReference: string | null; contractMatches: boolean;
  state: "PENDING" | "CONFIRMED" | "REJECTED" | "REFUNDED" | "CHARGEBACK" | "CANCELLED" | "UNKNOWN";
  paymentId: string | null; amountMinor: number | null; currencyCode: string;
  periodStart: Date | null; periodEnd: Date | null; resourceUpdatedAt: Date;
};
export interface SandboxBillingAdapter {
  readonly provider: BillingProvider;
  readonly origin: EvidenceOrigin;
  getSubscription(id: string): Promise<unknown>;
  preview(context: BillingContext): Promise<ProviderPreview>;
  execute(context: BillingContext, preview: ProviderPreview, payerEmail?: string): Promise<ProviderResult>;
  findUnknown(context: BillingContext): Promise<ProviderResult | null>;
  locate(notification: VerifiedNotification): Promise<{ operationReference: string | null; subscriptionId: string | null; paymentId: string | null }>;
  verifyNotification(rawBody: string, headers: Headers): Promise<VerifiedNotification>;
  observe(context: BillingContext, notification: VerifiedNotification, preview: ProviderPreview | null): Promise<ProviderObservation>;
}
export const money = z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(z.number().int().nonnegative().max(2_147_483_647));
export const providerDate = z.string().datetime({ offset: true }).transform(value => new Date(value));
export function assertProviderCurrency(value: string) { if (value !== "CLP") throw new Error("UNAPPROVED_PROVIDER_CURRENCY"); }
export function sandboxConfiguration(provider: BillingProvider) {
  if (typeof window !== "undefined" || process.env.NODE_ENV === "production" || process.env.COMMERCIAL_V2_PROVIDER_ENV !== "sandbox") throw new Error("SANDBOX_CONFIGURATION_REQUIRED");
  const key = process.env[provider === "PADDLE" ? "COMMERCIAL_V2_PADDLE_API_KEY" : "COMMERCIAL_V2_MP_ACCESS_TOKEN"] ?? "";
  if (provider === "PADDLE" ? !/^pdl_sdbx_apikey_/.test(key) : !key.startsWith("TEST-")) throw new Error("SANDBOX_CREDENTIAL_REQUIRED");
  const secret = process.env[provider === "PADDLE" ? "COMMERCIAL_V2_PADDLE_WEBHOOK_SECRET" : "COMMERCIAL_V2_MP_WEBHOOK_SECRET"];
  if (!secret) throw new Error("SANDBOX_WEBHOOK_SECRET_REQUIRED");
  return { key, secret };
}
export function assertSandboxMutation() {
  if (process.env.NODE_ENV === "production" || process.env.COMMERCIAL_V2_SANDBOX_WRITES !== "1") throw new Error("SANDBOX_MUTATIONS_DISABLED");
}
export function safeProviderReference(value: string) {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(value)) throw new Error("INVALID_PROVIDER_REFERENCE");
  return value;
}
