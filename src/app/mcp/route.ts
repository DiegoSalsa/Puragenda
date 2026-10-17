import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/server/mcp/server";
import { authenticateBearer } from "@/server/mcp/access";
import { mcpConfig, noStore } from "@/server/mcp/config";
import { limit, McpError } from "@/server/mcp/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let server: ReturnType<typeof createMcpServer> | undefined;
  let phase = "authorization";
  try {
    const { origin } = mcpConfig();
    const origins = new Set([origin, "https://chatgpt.com", ...(process.env.MCP_ALLOWED_ORIGINS || "").split(",").filter(Boolean)]);
    const transportHost = request.headers.get("host") ?? new URL(request.url).host;
    if (transportHost.toLowerCase() !== new URL(origin).host || (request.headers.has("origin") && !origins.has(request.headers.get("origin")!))) throw new McpError("INVALID_ORIGIN");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await limit(`http:${ip}`, 180);
    const identity = await authenticateBearer(request.headers.get("authorization"));
    phase = "initialization";
    server = createMcpServer(identity, ip);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 32768 });
    await server.connect(transport);
    phase = "transport";
    const response = await transport.handleRequest(request);
    Object.entries(noStore).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  } catch (error) {
    console.warn(JSON.stringify({ event: "mcp_http_error", phase, code: error instanceof McpError ? error.code : error instanceof Error ? error.name : "UnknownError" }));
    const status = error instanceof McpError ? error.status : 503;
    return Response.json({ error: status === 401 ? "invalid_token" : status === 429 ? "rate_limited" : "request_unavailable" }, { status, headers: {
      ...noStore, ...(status === 401 ? { "WWW-Authenticate": `Bearer resource_metadata="${mcpConfig().origin}/.well-known/oauth-protected-resource/mcp"` } : {}),
      ...(status === 429 || status === 503 ? { "Retry-After": "60" } : {}) } });
  } finally { await server?.close(); }
}
// Stateless Streamable HTTP does not require an idle SSE connection or sessions.
export function GET() { return new Response(null, { status: 405, headers: { ...noStore, Allow: "POST" } }); }
export function DELETE() { return new Response(null, { status: 405, headers: { ...noStore, Allow: "POST" } }); }
