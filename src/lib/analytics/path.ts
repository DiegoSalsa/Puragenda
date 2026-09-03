const STATIC_PATHS = new Set([
  "/",
  "/pricing",
  "/caracteristicas",
  "/soluciones",
  "/faq",
  "/sobre-nosotros",
  "/contacto",
  "/alternativa-agendapro",
  "/politica-de-privacidad",
  "/terminos-y-condiciones",
  "/privacidad/solicitud",
  "/login",
  "/register",
]);

const DYNAMIC_ROUTES: Array<[RegExp, string]> = [
  [/^\/widget\/[^/]+(?:\/.*)?$/, "/widget/[slug]"],
  [/^\/cita\/[^/]+(?:\/.*)?$/, "/cita/[appointment]"],
  [/^\/reagendar\/[^/]+(?:\/.*)?$/, "/reagendar/[appointment]"],
  [/^\/s\/[^/]+(?:\/.*)?$/, "/s/[token]"],
  [/^\/mi-plan\/[^/]+(?:\/.*)?$/, "/mi-plan/[token]"],
  [/^\/mi-agenda\/(?:entrar|activar|restablecer)\/[^/]+(?:\/.*)?$/, "/mi-agenda/[action]/[token]"],
  [/^\/mis-premios\/[^/]+(?:\/.*)?$/, "/mis-premios/[client]"],
  [/^\/responder\/[^/]+(?:\/.*)?$/, "/responder/[token]"],
  [/^\/encargo\/[^/]+(?:\/.*)?$/, "/encargo/[order]"],
  [/^\/guias\/[^/]+(?:\/.*)?$/, "/guias/[slug]"],
  [/^\/para\/[^/]+(?:\/.*)?$/, "/para/[industry]"],
  [/^\/funciones\/[^/]+(?:\/.*)?$/, "/funciones/[slug]"],
];

/**
 * Converts browser paths to a small, non-identifying taxonomy. Unknown nested
 * paths are collapsed to their first segment, so tokens can never reach either
 * the first-party store or a configured analytics provider.
 */
export function normalizeTrackingPath(input: string): string {
  let path: string;
  try {
    path = new URL(input, "https://analytics.invalid").pathname;
  } catch {
    return "/other";
  }

  if (STATIC_PATHS.has(path)) return path;
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "/dashboard/[section]";
  if (path === "/auth" || path.startsWith("/auth/")) return "/auth/[action]";
  if (path === "/guias") return "/guias";

  for (const [pattern, replacement] of DYNAMIC_ROUTES) {
    if (pattern.test(path)) return replacement;
  }

  const firstSegment = path.split("/").filter(Boolean)[0];
  return firstSegment && /^[a-z0-9-]{1,40}$/i.test(firstSegment)
    ? `/${firstSegment}/[other]`
    : "/other";
}

/**
 * GA4 landing-page reports need real public URLs. Tokenized and private
 * routes stay collapsed so identifiers never leave the browser as page_path.
 */
export function toGoogleAnalyticsPagePath(input: string): string {
  let path: string;
  try {
    path = new URL(input, "https://analytics.invalid").pathname;
  } catch {
    return "/other";
  }

  if (path === "/" || STATIC_PATHS.has(path) || path === "/guias") return path;
  if (path.startsWith("/para/x7k9m2v4q8")) return "/other";
  if (/^\/para\/[a-z0-9-]+$/i.test(path)) return path;
  if (/^\/funciones\/[a-z0-9-]+$/i.test(path)) return path;
  if (/^\/guias\/[a-z0-9-]+$/i.test(path)) return path;
  if (path === "/demo") return "/demo";
  return normalizeTrackingPath(path);
}

