/**
 * Presentation labels for the public directory.
 * Does not change slugs, category IDs, seoEnabled or stored taxonomy names.
 * Business names are shown exactly as configured. Do not title-case them.
 */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  barberias: "Barbería",
  peluquerias: "Peluquería",
  manicure: "Manicure / Nail Studio",
  bienestar: "Bienestar",
  estetica: "Estética",
  psicologia: "Psicología",
  kinesiologia: "Kinesiología",
  tatuajes: "Tatuajes",
  otro: "Otro",
};

const INTERNAL_LOCATION_NAME = /^(local\s+)?principal$|^sucursal(\s+principal)?$/i;

export function marketplaceCategoryDisplayName(slug: string, fallback?: string | null): string {
  return CATEGORY_DISPLAY_NAMES[slug] ?? fallback?.trim() ?? slug;
}

export function marketplacePublicLocationLabel(
  locationName: string | null | undefined,
  businessName: string,
): string | null {
  const name = locationName?.trim() ?? "";
  if (!name) return null;
  if (name.localeCompare(businessName.trim(), "es", { sensitivity: "accent" }) === 0) return null;
  if (INTERNAL_LOCATION_NAME.test(name)) return null;
  return name;
}

export function marketplaceVisibleServices(names: readonly string[], max = 3) {
  const cleaned = names.map((name) => name.trim()).filter(Boolean);
  return {
    visible: cleaned.slice(0, max),
    extra: Math.max(0, cleaned.length - max),
  };
}
