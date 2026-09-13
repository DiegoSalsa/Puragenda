const FALLBACK_PUBLIC_NAME = "Cliente";

function capitalizeWord(value: string) {
  const [first, ...rest] = Array.from(value);
  if (!first) return value;
  return `${first.toLocaleUpperCase("es")}${rest.join("").toLocaleLowerCase("es")}`;
}

/**
 * Minimal public identity for marketplace reviews.
 * "Camila Pérez González" → "Camila P."
 */
export function formatPublicReviewerName(fullName: string | null | undefined): string {
  const parts = (fullName ?? "")
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}'’-]/gu, ""))
    .filter(Boolean);

  if (parts.length === 0) return FALLBACK_PUBLIC_NAME;

  const first = capitalizeWord(parts[0]);
  if (parts.length === 1) return first;

  const surname = parts[1];
  const initial = Array.from(surname)[0];
  if (!initial) return first;
  return `${first} ${initial.toLocaleUpperCase("es")}.`;
}
