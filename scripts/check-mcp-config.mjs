import assert from "node:assert/strict";
const origin = new URL(process.env.MCP_ORIGIN || "https://www.puragenda.cl");
assert(origin.protocol === "https:" && origin.pathname === "/" && !origin.search && !origin.hash && !origin.username && !origin.password, "MCP_ORIGIN must be a public HTTPS origin");
assert(Buffer.from(process.env.MCP_OPERATION_ENCRYPTION_KEY || "", "base64").length === 32, "MCP_OPERATION_ENCRYPTION_KEY must encode exactly 32 random bytes");
assert((process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "").length >= 32, "A strong Puragenda session secret is required");
for (const name of ["DATABASE_URL", "DIRECT_URL", "CRON_SECRET"]) assert(process.env[name], `${name} is required`);
for (const uri of (process.env.MCP_OAUTH_REDIRECT_URIS || "https://chatgpt.com/connector_platform_oauth_redirect").split(",")) {
  const url = new URL(uri.trim()); assert(url.protocol === "https:" && !url.username && !url.password && !url.hash, "OAuth callbacks must be exact HTTPS URLs");
}
console.log("MCP configuration syntax and required secrets: PASS. No credential values printed. Remote reachability, database role, domain challenge and portal validation require separate checks.");
