export function effectiveWebsiteHeadline(config: { headline?: string | null; copy?: { hero?: { fallbackHeadline?: string | null } } | null }) {
  return (config.headline ?? "").trim() || (config.copy?.hero?.fallbackHeadline ?? "").trim();
}
