import { MercadoPagoConfig } from "mercadopago";

/**
 * Centralized MercadoPago client instance.
 * Used by: billing/subscribe, billing/verify, webhooks/mercadopago, discount.service
 *
 * In production runtime, MERCADOPAGO_ACCESS_TOKEN must be set or API calls will fail.
 * During build time (next build), the token may not be available — we gracefully handle this.
 */

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken && process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
  // Only warn at build time — will fail at runtime if not set
  console.warn("[mercadopago] MERCADOPAGO_ACCESS_TOKEN not set — MP calls will fail.");
}

export const mpClient = new MercadoPagoConfig({
  accessToken: accessToken || "",
});