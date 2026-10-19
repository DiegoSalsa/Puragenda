import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const calls = vi.hoisted(() => ({ sql: vi.fn(), connections: vi.fn(), transaction: vi.fn(), session: vi.fn(), cookies: vi.fn(), translations: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $queryRaw: calls.sql, $transaction: calls.transaction, mcpConnection: { findMany: calls.connections } } }));
vi.mock("@/server/auth/user-session", () => ({ getCurrentSessionUser: calls.session, getApiSessionUser: calls.session }));
vi.mock("next/headers", () => ({ cookies: calls.cookies }));
vi.mock("next-intl/server", () => ({ getTranslations: calls.translations }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_HTTP_ERROR_FALLBACK;404"); }, redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn() }));

import { mcpEnabled } from "@/server/mcp/config";
import { POST as mcpPost, GET as mcpGet, DELETE as mcpDelete } from "@/app/mcp/route";
import { GET as oauthGet, POST as oauthPost } from "@/app/oauth/[action]/route";
import { GET as protectedResource } from "@/app/.well-known/oauth-protected-resource/route";
import { GET as protectedResourceAlias } from "@/app/.well-known/oauth-protected-resource/mcp/route";
import { GET as authorizationMetadata } from "@/app/.well-known/oauth-authorization-server/route";
import { GET as challenge } from "@/app/.well-known/openai-apps-challenge/route";
import { GET as approvalGet, POST as approvalPost } from "@/app/mcp/confirm/[receipt]/route";
import { McpConnections } from "@/app/dashboard/settings/mcp-connections";
import IntegrationPage from "@/app/integraciones/chatgpt/page";
import ConnectionsPage from "@/app/integraciones/chatgpt/conexiones/page";
import ConsentPage from "@/app/oauth/consent/page";
import { revokeMcpConnection, updateMcpPublicDiscovery } from "@/server/actions/mcp.actions";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("MCP dark launch", () => {
  it("is off unless the server explicitly enables it, regardless of a browser flag", () => {
    vi.stubEnv("NEXT_PUBLIC_MCP_ENABLED", "true");
    for (const value of [undefined, "", "false", "1", "TRUE"]) { vi.stubEnv("MCP_ENABLED", value); expect(mcpEnabled()).toBe(false); }
    vi.stubEnv("MCP_ENABLED", "true"); expect(mcpEnabled()).toBe(true);
  });

  it("returns 404 for transport, all OAuth entry points, metadata and approval before authentication or SQL", async () => {
    vi.stubEnv("MCP_ENABLED", ""); vi.stubEnv("OPENAI_APPS_CHALLENGE", "configured-test-challenge");
    const responses = [mcpGet(), mcpDelete(), protectedResource(), protectedResourceAlias(), authorizationMetadata(), challenge(),
      await mcpPost(new Request("https://example.invalid/mcp", { method: "POST" }))];
    for (const action of ["authorize", "register", "decision", "token", "revoke"]) {
      const context = { params: Promise.resolve({ action }) };
      responses.push(await oauthGet(new NextRequest(`https://example.invalid/oauth/${action}`), context));
      responses.push(await oauthPost(new NextRequest(`https://example.invalid/oauth/${action}`, { method: "POST" }), context));
    }
    const context = { params: Promise.resolve({ receipt: "never-read" }) };
    responses.push(await approvalGet(new NextRequest("https://example.invalid/mcp/confirm/never-read"), context));
    responses.push(await approvalPost(new NextRequest("https://example.invalid/mcp/confirm/never-read", { method: "POST" }), context));
    for (const response of responses) { expect(response.status).toBe(404); expect(response.headers.get("cache-control")).toContain("no-store"); }
    expect(calls.sql).not.toHaveBeenCalled(); expect(calls.session).not.toHaveBeenCalled(); expect(calls.transaction).not.toHaveBeenCalled();
  });

  it("hides the settings card and direct pages and rejects actions before reading a session or connections", async () => {
    vi.stubEnv("MCP_ENABLED", "false");
    expect(await McpConnections({ userId: "a", businessId: "b", owner: true, publicDiscovery: true })).toBeNull();
    expect(() => IntegrationPage()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(ConnectionsPage()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(ConsentPage({ searchParams: Promise.resolve({ id: "unused" }) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(updateMcpPublicDiscovery(new FormData())).rejects.toThrow("MCP_DISABLED");
    await expect(revokeMcpConnection(new FormData())).rejects.toThrow("MCP_DISABLED");
    for (const call of Object.values(calls)) expect(call).not.toHaveBeenCalled();
  });

  it("exposes metadata and the stateless method contract when explicitly enabled", () => {
    vi.stubEnv("MCP_ENABLED", "true"); vi.stubEnv("MCP_ORIGIN", "https://example.invalid");
    expect(mcpGet().status).toBe(405); expect(mcpDelete().status).toBe(405);
    expect(authorizationMetadata().status).toBe(200); expect(protectedResource().status).toBe(200);
  });
});
