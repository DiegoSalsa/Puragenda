// Exact-model Standard text pricing snapshot. Other models/tiers stay unknown.
export const PLUS_VERIFIED_PRICE = Object.freeze({
  model: "gpt-6-luna", verifiedAt: "2026-10-28", validUntil: "2026-11-28T00:00:00Z",
  source: "https://developers.openai.com/api/docs/models/gpt-6-luna",
  input: 0.10, cachedInput: 0.01, cacheWrite: 0.125, output: 0.50,
});
export function verifiedModelMicros(model: string, input: number, output: number, cached: number, writes: number | undefined) {
  if (process.env.PURI_PLUS_VERIFIED_PRICING_ENABLED !== "1" || model !== PLUS_VERIFIED_PRICE.model || Date.now() >= Date.parse(PLUS_VERIFIED_PRICE.validUntil) ||
    ![input, output, cached, writes].every(value => Number.isSafeInteger(value) && value! >= 0) || cached + writes! > input) return null;
  return Math.ceil((input - cached - writes!) * PLUS_VERIFIED_PRICE.input + cached * PLUS_VERIFIED_PRICE.cachedInput + writes! * PLUS_VERIFIED_PRICE.cacheWrite + output * PLUS_VERIFIED_PRICE.output);
}
