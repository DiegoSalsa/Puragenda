export const DEFAULT_LOYALTY_CODE_PREFIX = "PREMIO";

export function normalizeLoyaltyCodePrefix(value: string | null | undefined) {
  const normalized = (value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 16);

  return normalized || DEFAULT_LOYALTY_CODE_PREFIX;
}

export function buildLoyaltyRewardCode(prefix: string, randomHex: string) {
  return `${normalizeLoyaltyCodePrefix(prefix)}-${randomHex.toUpperCase()}`;
}
