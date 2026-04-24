// ═══════════════════════════════════════════
// Puragenda — Slug Generation & Validation
// ═══════════════════════════════════════════

/**
 * Converts a string to a URL-safe slug.
 * Handles accented characters (ñ, á, é, etc.) common in Spanish.
 */
export function toSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "mi-negocio";
}

/**
 * Validates that a slug is well-formed.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 100;
}
