/**
 * Crawl and indexing policy for Puragenda.
 *
 * Search/retrieval crawlers may read public commercial pages. Private app
 * surfaces stay non-indexable via noindex headers/meta, auth, and robots
 * disallows for unlinked internals (APIs, admin, tokenized customer flows).
 *
 * Linked app URLs (login, register, dashboard, /demo, /mi-agenda, /auth)
 * are intentionally NOT robots-disallowed: they appear in public HTML, so a
 * Disallow would be reported as "Googlebot blocked" while still leaking the
 * URL. Those routes use noindex + auth instead.
 */

export const PRIVATE_PAGE_ROBOTS = { index: false, follow: false } as const;

/**
 * Prefixes blocked in robots.txt. Matching is robots.txt prefix matching.
 * Trailing slashes are included so `/para/x7k9m2v4q8` does not collide with
 * public industry URLs such as `/para/barberias`.
 */
export const ROBOTS_DISALLOW_PREFIXES = [
  "/api/",
  "/admin/",
  "/cita/",
  "/encargo/",
  "/mi-plan/",
  "/mis-premios/",
  "/reagendar/",
  "/responder/",
  "/para/x7k9m2v4q8",
  "/s/",
] as const;

/**
 * Next.js `headers()` sources that must send X-Robots-Tag: noindex.
 * Includes both robots-disallowed internals and linked app surfaces.
 */
export const NOINDEX_HEADER_SOURCES = [
  "/dashboard/:path*",
  "/login",
  "/register",
  "/demo",
  "/widget/:path*",
  "/cita/:path*",
  "/encargo/:path*",
  "/mi-plan/:path*",
  "/mis-premios/:path*",
  "/reagendar/:path*",
  "/responder/:path*",
  "/para/x7k9m2v4q8/:path*",
  "/auth/:path*",
  "/mi-agenda/:path*",
  "/privacidad/solicitud",
  "/s/:path*",
  "/api/:path*",
] as const;

/**
 * Crawlers allowed to read public commercial pages.
 *
 * - Googlebot: Google Search and AI Overviews/AI Mode. Required.
 * - bingbot: Bing and Copilot search.
 * - OAI-SearchBot: ChatGPT search index. Retrieval, not GPTBot training.
 * - ChatGPT-User: on-demand fetch when a person asks ChatGPT to open a URL.
 * - Google-Extended: Gemini training/grounding. Does not affect Google Search
 *   ranking. Allowed on public marketing pages so Gemini can cite the product;
 *   private routes stay disallowed.
 * - Perplexity* / Claude-Search/User: AI search and on-demand retrieval.
 *
 * Training-only bots not listed here (GPTBot, ClaudeBot, CCBot, Bytespider)
 * inherit User-agent `*`: public pages allowed, private prefixes disallowed.
 * They are not given a site-wide Allow or Disallow: / without a separate
 * product decision.
 */
export const SEARCH_AND_RETRIEVAL_USER_AGENTS = [
  "Googlebot",
  "Google-Extended",
  "bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
] as const;

export const DEMO_PUBLIC_PATH = "/demo";
export const DEMO_LOGIN_PATH = "/api/auth/demo";

const CRAWLER_UA_TOKENS = [
  "googlebot",
  "google-extended",
  "google-inspectiontool",
  "bingbot",
  "bingpreview",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "yandex.com/bots",
  "oai-searchbot",
  "chatgpt-user",
  "gptbot",
  "claude-searchbot",
  "claude-user",
  "claudebot",
  "perplexitybot",
  "perplexity-user",
  "ccbot",
  "bytespider",
  "applebot",
  "semrushbot",
  "ahrefsbot",
  "dotbot",
  "mj12bot",
  "petalbot",
  "facebookexternalhit",
  "linkedinbot",
  "twitterbot",
] as const;

export function isKnownCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_UA_TOKENS.some((token) => ua.includes(token));
}

export function isRobotsDisallowedPath(pathname: string): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return ROBOTS_DISALLOW_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function longestRobotsDirectiveMatch(pathname: string, directives: readonly string[]): string | null {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  let winner: string | null = null;
  for (const directive of directives) {
    if (path.startsWith(directive) && (winner === null || directive.length > winner.length)) {
      winner = directive;
    }
  }
  return winner;
}

export function isPathDisallowedForCrawler(pathname: string): boolean {
  const allow = longestRobotsDirectiveMatch(pathname, ["/"]);
  const disallow = longestRobotsDirectiveMatch(pathname, ROBOTS_DISALLOW_PREFIXES);
  if (!disallow) return false;
  if (!allow) return true;
  return disallow.length >= allow.length;
}

const NOINDEX_PATH_PREFIXES = [
  "/dashboard",
  "/login",
  "/register",
  "/demo",
  "/widget/",
  "/cita/",
  "/encargo/",
  "/mi-plan/",
  "/mis-premios/",
  "/reagendar/",
  "/responder/",
  "/para/x7k9m2v4q8",
  "/auth/",
  "/mi-agenda",
  "/privacidad/solicitud",
  "/s/",
  "/api/",
] as const;

export function isNoIndexPath(pathname: string): boolean {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return NOINDEX_PATH_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return path.startsWith(prefix);
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}
