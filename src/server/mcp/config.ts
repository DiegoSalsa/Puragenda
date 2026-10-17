import { z } from "zod";

export const SCOPES = {
  "account:read": "Identificar la cuenta y el negocio conectado",
  "agenda:read": "Consultar agenda, servicios y disponibilidad",
  "analytics:read": "Consultar estadísticas autorizadas",
  "clients:read": "Consultar clientes sin notas privadas",
  "loyalty:read": "Consultar fidelización y gift cards",
  "appointments:write": "Preparar y ejecutar cambios de citas con aprobación en Puragenda",
} as const;
export type McpScope = keyof typeof SCOPES;
export const scopeSchema = z.enum(Object.keys(SCOPES) as [McpScope, ...McpScope[]]);

export function mcpConfig() {
  const url = new URL(process.env.MCP_ORIGIN || "https://www.puragenda.cl");
  if (url.origin !== url.href.replace(/\/$/, "") || url.username || url.password
    || (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("MCP_ORIGIN must be an HTTPS origin (loopback allowed in development)");
  }
  return { origin: url.origin, issuer: url.origin, resource: `${url.origin}/mcp` };
}

export function parseScopes(scope: string): McpScope[] {
  return z.array(scopeSchema).min(1).max(6).parse([...new Set(scope.split(" ").filter(Boolean))]);
}

export function allowedRedirect(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.username || url.password || url.hash) return false;
    const allowed = (process.env.MCP_OAUTH_REDIRECT_URIS || "https://chatgpt.com/connector_platform_oauth_redirect").split(",").map((item) => item.trim());
    if (url.protocol === "https:" && allowed.includes(uri)) return true;
    return process.env.MCP_OAUTH_ALLOW_LOOPBACK === "true" && url.protocol === "http:"
      && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      && /^\/callback(?:\/[A-Za-z0-9_-]{1,128})?$/.test(url.pathname) && !url.search;
  } catch { return false; }
}

export function oauthFormActions() {
  const sources = (process.env.MCP_OAUTH_REDIRECT_URIS || "https://chatgpt.com/connector_platform_oauth_redirect")
    .split(",").map((uri) => uri.trim()).filter(allowedRedirect).map((uri) => new URL(uri).origin);
  if (process.env.MCP_OAUTH_ALLOW_LOOPBACK === "true") sources.push("http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*");
  return [...new Set(sources)].join(" ");
}

// same-origin suppresses cross-origin referrers without making ordinary HTML
// form POSTs emit an opaque Origin (which our CSRF checks correctly reject).
export const noStore = { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "same-origin", "X-Content-Type-Options": "nosniff" };
export const oauthCookie = "puragenda_mcp_oauth";
export const cookieOptions = () => ({ httpOnly: true, secure: mcpConfig().origin.startsWith("https:"), sameSite: "lax" as const, path: "/oauth", maxAge: 600 });
