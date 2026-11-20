// Exact-model Standard text pricing snapshot. Other models/tiers stay unknown.
export const PLUS_VERIFIED_PRICE = Object.freeze({
  model: "gpt-6-luna", verifiedAt: "2026-10-28", validUntil: "2026-11-28T00:00:00Z",
  source: "https://developers.openai.com/api/docs/models/gpt-6-luna",
  input: 0.10, cachedInput: 0.01, cacheWrite: 0.125, output: 0.50,
});
type ModelPrice = { input: number; output: number; cachedInput?: number; cacheWrite?: number };

export function configuredModelPrice(model: string): ModelPrice | null {
  try {
    const prices = JSON.parse(process.env.PURI_MODEL_PRICES_USD_PER_MILLION ?? "{}") as Record<string, ModelPrice> | null;
    const price = prices && Object.hasOwn(prices, model) ? prices[model] : null;
    if (!price || ![price.input, price.output, price.cachedInput ?? price.input, price.cacheWrite ?? price.input]
      .every(rate => Number.isFinite(rate) && rate >= 0)) return null;
    return price;
  } catch {
    return null;
  }
}

export function hasVerifiedModelPrice(model: string) {
  return process.env.PURI_PLUS_VERIFIED_PRICING_ENABLED === "1" &&
    model === PLUS_VERIFIED_PRICE.model && Date.now() < Date.parse(PLUS_VERIFIED_PRICE.validUntil);
}

export function verifiedModelMicros(model: string, input: number, output: number, cached: number, writes: number | undefined) {
  if (!hasVerifiedModelPrice(model) ||
    ![input, output, cached, writes].every(value => Number.isSafeInteger(value) && value! >= 0) || cached + writes! > input) return null;
  return Math.ceil((input - cached - writes!) * PLUS_VERIFIED_PRICE.input + cached * PLUS_VERIFIED_PRICE.cachedInput + writes! * PLUS_VERIFIED_PRICE.cacheWrite + output * PLUS_VERIFIED_PRICE.output);
}
