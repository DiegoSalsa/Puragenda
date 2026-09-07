export function foldMarketplaceSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function marketplaceSearchMatches(haystack: string, needle: string): boolean {
  const foldedNeedle = foldMarketplaceSearch(needle);
  if (!foldedNeedle) return true;
  return foldMarketplaceSearch(haystack).includes(foldedNeedle);
}
