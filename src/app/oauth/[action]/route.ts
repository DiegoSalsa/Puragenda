import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { startAuthorization, decideAuthorization, exchangeToken, registerClient, revokeToken, assertUnique } from "@/server/mcp/oauth";
import { cookieOptions, noStore, oauthCookie, mcpConfig } from "@/server/mcp/config";
import { limit, McpError, readLimited, requireSameOrigin } from "@/server/mcp/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function handle(request: NextRequest, action: string) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await limit(`oauth:${action}:${ip}`, action === "register" ? 10 : 40);
    if (action === "authorize" && request.method === "GET") {
      if (request.url.length > 8192) throw new McpError("invalid_request", 400);
      const { request: transaction, csrf } = await startAuthorization(request.nextUrl.searchParams);
      const response = NextResponse.redirect(new URL(`/oauth/consent?id=${transaction.id}`, mcpConfig().origin), 303);
      response.cookies.set(oauthCookie, csrf, cookieOptions());
      return response;
    }
    if (request.method !== "POST") return Response.json({ error: "invalid_request" }, { status: 405, headers: noStore });
    const contentType = request.headers.get("content-type")?.split(";")[0];
    if (action === "register") {
      if (contentType !== "application/json") throw new McpError("invalid_request", 400);
      return Response.json(await registerClient(JSON.parse(await readLimited(request, 8192))), { status: 201, headers: noStore });
    }
    if (contentType !== "application/x-www-form-urlencoded") throw new McpError("invalid_request", 400);
    const body = new URLSearchParams(await readLimited(request, 8192));
    assertUnique(body);
    if (action === "decision") {
      requireSameOrigin(request);
      const user = await getApiSessionUser(request);
      if (!user) throw new McpError("AUTHENTICATION_REQUIRED", 401);
      const csrf = request.cookies.get(oauthCookie)?.value || "";
      if (!csrf || body.get("csrf") !== csrf) throw new McpError("INVALID_CSRF");
      await limit(`oauth:decision:${user.id}`, 20);
      const url = await decideAuthorization({ requestId: body.get("requestId") || "", csrf, userId: user.id,
        businessId: body.get("businessId") || undefined, approve: body.get("decision") === "approve" });
      const response = NextResponse.redirect(url, 303);
      response.cookies.set(oauthCookie, "", { ...cookieOptions(), maxAge: 0 });
      return response;
    }
    if (request.headers.has("authorization")) throw new McpError("invalid_client", 401); // Public clients: authentication method none.
    await limit(`oauth:client:${body.get("client_id") || "unknown"}`, 120);
    if (action === "token") return Response.json(await exchangeToken(body), { headers: noStore });
    if (action === "revoke") { await revokeToken(body); return new Response(null, { status: 200, headers: noStore }); }
    return Response.json({ error: "invalid_request" }, { status: 404, headers: noStore });
  } catch (error) {
    const code = error instanceof McpError ? error.code : error instanceof ZodError || error instanceof SyntaxError ? "invalid_request" : "temporarily_unavailable";
    const status = error instanceof McpError ? error.status : code === "invalid_request" ? 400 : 503;
    return Response.json({ error: code }, { status, headers: { ...noStore, ...(status === 429 || status === 503 ? { "Retry-After": "60" } : {}) } });
  }
}
export async function GET(request: NextRequest, context: { params: Promise<{ action: string }> }) { return handle(request, (await context.params).action); }
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) { return handle(request, (await context.params).action); }
