import { describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "@/server/mcp/server";
import { allowedRedirect, mcpConfig, parseScopes, oauthFormActions, oauthChallenge } from "@/server/mcp/config";
import { decrypt, encrypt, readLimited, requireSameOrigin } from "@/server/mcp/security";
import { creationSchema, mutationSchema } from "@/server/mcp/operations";
import { authorizationSchema, registrationSchema } from "@/server/mcp/oauth";
import { GET as cleanup } from "@/app/api/cron/mcp-cleanup/route";

describe("MCP boundary contracts", () => {
  it("discovers 30 independent tools through an official MCP client, with strict schemas and annotations", async () => {
    const server = createMcpServer(null);
    const client = new Client({ name: "protocol-contract", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a); await client.connect(b);
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(30);
    expect(new Set(tools.map((t) => t.name)).size).toBe(30);
    for (const tool of tools) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.inputSchema.properties).not.toHaveProperty("businessId");
      expect(tool.annotations).toMatchObject({ readOnlyHint: expect.any(Boolean), destructiveHint: expect.any(Boolean), openWorldHint: expect.any(Boolean) });
      expect(tool._meta).toHaveProperty("securitySchemes");
      expect(tool.description!.length).toBeGreaterThan(20);
    }
    const profile = tools.find((t) => t.name === "get_connected_account")!;
    expect(profile._meta).toMatchObject({ "openai/profile": true });
    expect(profile.outputSchema).toMatchObject({ required: ["id"], additionalProperties: false });
    const unauthorized = await client.callTool({ name: "get_business_profile", arguments: {} });
    expect(unauthorized).toMatchObject({ isError: true, structuredContent: { error: "AUTHENTICATION_REQUIRED" } });
    expect(unauthorized._meta).toHaveProperty("mcp/www_authenticate");
    const challenge = (unauthorized._meta!["mcp/www_authenticate"] as string[])[0];
    expect(challenge).toContain('error="invalid_token"'); expect(challenge).toContain('error_description="');
    expect(oauthChallenge("analytics:read", true)).toContain('error="insufficient_scope"');
    expect(oauthChallenge("analytics:read", true)).toContain('scope="analytics:read"');
    expect(tools.find((t) => t.name === "create_appointment")!.annotations).toMatchObject({ openWorldHint: true, destructiveHint: true });
    expect(tools.find((t) => t.name === "confirm_public_booking")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true, idempotentHint: true });
    expect(tools.find((t) => t.name === "prepare_public_booking")!.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: false, idempotentHint: true });
    expect((await client.callTool({ name: "get_business_profile", arguments: { businessId: "other" } })).isError).toBe(true);
    await client.close(); await server.close();
  });
  it("accepts only explicitly registered HTTPS callbacks or explicitly enabled loopback callbacks", () => {
    vi.stubEnv("MCP_OAUTH_REDIRECT_URIS", "https://chatgpt.com/connector_platform_oauth_redirect");
    vi.stubEnv("MCP_OAUTH_ALLOW_LOOPBACK", "false");
    expect(allowedRedirect("https://chatgpt.com/connector_platform_oauth_redirect")).toBe(true);
    for (const url of ["https://chatgpt.com.evil.test/connector_platform_oauth_redirect", "https://evil.test/callback", "https://user@chatgpt.com/connector_platform_oauth_redirect", "https://chatgpt.com/connector_platform_oauth_redirect#fragment", "http://127.0.0.1:3333/callback"]) expect(allowedRedirect(url)).toBe(false);
    vi.stubEnv("MCP_OAUTH_ALLOW_LOOPBACK", "true");
    expect(allowedRedirect("http://127.0.0.1:3333/callback")).toBe(true);
    expect(allowedRedirect("http://127.0.0.1:3333/callback/BKj9umzr4ef_")).toBe(true);
    expect(allowedRedirect("http://localhost:3333/callback/BKj9umzr4ef_")).toBe(true);
    for (const url of ["http://127.0.0.1:3333/callback/one/two", "http://127.0.0.1:3333/callback/id?next=evil", "http://127.0.0.1:3333/callback/%2fescape", "http://127.0.0.1:3333/other", "http://user@127.0.0.1:3333/callback"]) expect(allowedRedirect(url)).toBe(false);
    expect(allowedRedirect("http://127.0.0.1.evil.test:3333/callback")).toBe(false);
    expect(oauthFormActions()).toContain("https://chatgpt.com"); expect(oauthFormActions()).toContain("http://127.0.0.1:*");
    expect(oauthFormActions()).not.toContain("evil.test");
    vi.unstubAllEnvs();
  });
  it("rejects plain PKCE, unknown scopes, unknown registration capabilities and boolean write confirmations", () => {
    expect(() => parseScopes("account:read admin:all")).toThrow();
    expect(() => authorizationSchema.parse({ response_type: "code", code_challenge_method: "plain" })).toThrow();
    expect(() => registrationSchema.parse({ client_name: "Client", redirect_uris: ["https://example.invalid/callback"], token_endpoint_auth_method: "client_secret_post" })).toThrow();
    expect(() => creationSchema.parse({ businessId: "foreign", confirmed: true })).toThrow();
    expect(() => mutationSchema.parse({ operationKey: "x", appointmentId: "y", locationId: "z", confirmed: true })).toThrow();
  });
  it("requires exact same-origin browser posts", () => {
    vi.stubEnv("MCP_ORIGIN", "https://www.puragenda.cl");
    expect(() => requireSameOrigin(new Request("https://www.puragenda.cl/oauth/decision", { headers: { Origin: "https://evil.test" } }))).toThrow("INVALID_ORIGIN");
    expect(() => requireSameOrigin(new Request("https://www.puragenda.cl/oauth/decision"))).toThrow();
    expect(() => requireSameOrigin(new Request("https://www.puragenda.cl/oauth/decision", { headers: { Origin: mcpConfig().origin } }))).not.toThrow();
    vi.unstubAllEnvs();
  });
  it("encrypts preparations with authenticated encryption and fails closed without a key", () => {
    vi.stubEnv("MCP_OPERATION_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    const value = { email: "private@example.invalid", appointmentId: "a" };
    const ciphertext = encrypt(value);
    expect(ciphertext).not.toContain("private"); expect(decrypt(ciphertext)).toEqual(value);
    const modified = Buffer.from(ciphertext, "base64"); modified[modified.length - 1] ^= 1;
    expect(() => decrypt(modified.toString("base64"))).toThrow();
    vi.stubEnv("MCP_OPERATION_ENCRYPTION_KEY", ""); expect(() => encrypt(value)).toThrow("WRITES_UNAVAILABLE");
    vi.unstubAllEnvs();
  });
  it("bounds bodies even without Content-Length", async () => {
    const request = new Request("https://www.puragenda.cl/mcp", { method: "POST", body: "x".repeat(32769) });
    await expect(readLimited(request)).rejects.toThrow("REQUEST_TOO_LARGE");
  });
  it("rejects invalid cron credentials including unequal UTF-8 byte lengths without throwing", async () => {
    vi.stubEnv("CRON_SECRET", "fixture");
    expect((await cleanup(new Request("https://www.puragenda.cl/api/cron/mcp-cleanup", { headers: { Authorization: "Bearer ficturé" } }))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await cleanup(new Request("https://www.puragenda.cl/api/cron/mcp-cleanup"))).status).toBe(401);
    vi.unstubAllEnvs();
  });
});
