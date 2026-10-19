import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { AddressInfo } from "node:net";
import pg from "pg";

const providers = vi.hoisted(() => ({ notify: vi.fn(), sync: vi.fn(), busy: vi.fn(), adminCookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => providers.adminCookies.has(name) ? { value: providers.adminCookies.get(name) } : undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/email/send", () => ({ sendBookingNotifications: providers.notify }));
vi.mock("@/server/services/google-calendar.service", () => ({ syncAppointmentToGoogle: providers.sync, getGoogleCalendarBusySlots: providers.busy }));
vi.mock("@/server/services/mercadopago-oauth.service", () => ({ getValidMercadoPagoAccessToken: async () => null }));
vi.mock("@/server/services/widget-promotion.service", () => ({ resolveWidgetPromotion: async () => ({ promotion: null, quote: null }) }));
vi.mock("@/server/services/client-portal.service", () => ({ getClientPortalAccountFromRequest: async () => null, getClientPortalEmailFromRequest: async () => null, updateClientPortalProfileFromBooking: async () => {} }));

import { prisma } from "@/server/db/prisma";
import { POST as mcp } from "@/app/mcp/route";
import { GET as oauthGet, POST as oauthPost } from "@/app/oauth/[action]/route";
import { GET as approvalGet, POST as approvalPost } from "@/app/mcp/confirm/[receipt]/route";
import { registerClient, startAuthorization, decideAuthorization, exchangeToken, revokeToken } from "@/server/mcp/oauth";
import { createSessionToken, AUTH_COOKIE_NAME } from "@/server/auth/session";
import { authenticateBearer, authorizedContext, type McpIdentity } from "@/server/mcp/access";
import { readTools } from "@/server/mcp/read-tools";
import { prepareCreation, prepareMutation, executeOperation, creationSchema } from "@/server/mcp/operations";
import { publicCatalog, publicAvailability, searchPublicBusinesses } from "@/server/mcp/public";
import { SCOPES } from "@/server/mcp/config";
import { digest, limit, secret } from "@/server/mcp/security";
import { cleanupMcpData } from "@/server/mcp/retention";
import { McpConnections } from "@/app/dashboard/settings/mcp-connections";
import { createSuperAdminSession, ADMIN_AUTH_COOKIE_NAME } from "@/server/auth/admin-session";
import { setMcpBusinessAccess } from "@/server/actions/mcp-rollout.actions";

const database = process.env.PURAGENDA_BOOKING_TEST_DATABASE_URL;
const enabled = process.env.PURAGENDA_MCP_TEST === "1" && !!database && ["127.0.0.1", "localhost", "[::1]"].includes(new URL(database).hostname)
  && new URL(database).pathname === "/puragenda_booking_api_test" && /^booking_api_test_\d+$/.test(new URL(database).searchParams.get("schema") ?? "");
const redirectUri = "https://chatgpt.com/connector_platform_oauth_redirect";
const startTime = "2026-10-01T12:00:00.000Z";
const creation = { operationKey: randomUUID(), locationId: "mcp-location-a", serviceId: "mcp-service-a", staffId: "mcp-staff-a", startTime,
  selectedOptionAlternativeIds: [], customerName: "Cliente ficticio", customerEmail: "mcp-client@example.invalid", customerPhone: "+56911111111" };
let origin = "";
let http: Server;
const identity = (token: string) => authenticateBearer(`Bearer ${token}`) as Promise<McpIdentity>;
const tool = async (name: string, input: Record<string, unknown>, auth: McpIdentity) => readTools.find((t) => t.name === name)!.run(input, auth);

async function link(userId = "mcp-owner-a", scopes = Object.keys(SCOPES), businessId = "mcp-business-a") {
  const client = await registerClient({ client_name: "MCP test client", redirect_uris: [redirectUri] });
  const verifier = secret();
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const flow = await startAuthorization(new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri: redirectUri,
    code_challenge: challenge, code_challenge_method: "S256", state: secret(), resource: `${origin}/mcp`, scope: scopes.join(" ") }));
  const callback = new URL(await decideAuthorization({ requestId: flow.request.id, csrf: flow.csrf, userId, businessId, approve: true }));
  const params = new URLSearchParams({ grant_type: "authorization_code", client_id: client.client_id, redirect_uri: redirectUri,
    code: callback.searchParams.get("code")!, code_verifier: verifier, resource: `${origin}/mcp` });
  return { client, flow, params, token: await exchangeToken(params) };
}
async function sessionCookie(userId = "mcp-owner-a") {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return `${AUTH_COOKIE_NAME}=${createSessionToken({ ...user, isSuperAdmin: false, adminAccess: false })}`;
}
async function approve(receipt: string, userId?: string) {
  const cookie = userId ? await sessionCookie(userId) : "";
  const ctx = { params: Promise.resolve({ receipt }) };
  const get = await approvalGet(new NextRequest(`${origin}/mcp/confirm/${receipt}`, { headers: { cookie } }), ctx);
  const html = await get.text();
  const csrf = /name="csrf" value="([^"]+)"/.exec(html)?.[1];
  expect(csrf).toBeTruthy();
  const approvalCookie = get.headers.get("set-cookie")!.split(";")[0];
  const post = await approvalPost(new NextRequest(`${origin}/mcp/confirm/${receipt}`, { method: "POST", headers: { Origin: origin, cookie: `${cookie}; ${approvalCookie}` }, body: new URLSearchParams({ csrf: csrf!, approve: "yes" }) }), ctx);
  expect(post.status).toBe(200);
}

describe.skipIf(!enabled)("MCP/OAuth with isolated PostgreSQL and real HTTP transport", () => {
  beforeAll(async () => {
    http = createServer(async (req, res) => {
      try {
        const chunks = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const headers = new Headers(); for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(",") : value);
        const request = new NextRequest(`${origin}${req.url}`, { method: req.method, headers, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
        let response: Response;
        if (req.url === "/mcp" && req.method === "POST") response = await mcp(request);
        else if (req.url?.startsWith("/oauth/")) {
          const action = new URL(request.url).pathname.split("/")[2];
          response = await (req.method === "GET" ? oauthGet : oauthPost)(request, { params: Promise.resolve({ action }) });
        } else response = new Response(null, { status: 405 });
        res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
      } catch { res.writeHead(500); res.end(); }
    });
    await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    providers.adminCookies.clear();
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-30T12:00:00.000Z"));
    vi.stubEnv("MCP_ORIGIN", origin); vi.stubEnv("AUTH_SECRET", "local-mcp-auth-secret-at-least-32-characters");
    vi.stubEnv("MCP_OPERATION_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
    vi.stubEnv("MCP_OAUTH_REDIRECT_URIS", redirectUri);
    vi.stubEnv("MCP_PUBLIC_BOOKING_ENABLED", "true");
    vi.stubEnv("MCP_ENABLED", "true");
    vi.stubEnv("MCP_REVIEW_SUPPRESS_EFFECTS", "false");
    vi.stubEnv("MCP_REVIEW_USER_IDS", "mcp-owner-a,mcp-owner-b,mcp-employee");
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "mcp-business-a,mcp-business-b");
    await prisma.mcpRolloutState.deleteMany();
    providers.notify.mockResolvedValue(undefined); providers.sync.mockResolvedValue({ synced: true }); providers.busy.mockResolvedValue([]);
    await prisma.business.deleteMany({ where: { id: { startsWith: "mcp-business-" } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: "mcp-" } } });
    await prisma.mcpOAuthClient.deleteMany(); await prisma.apiRateLimitBucket.deleteMany();
    for (const suffix of ["a", "b"]) {
      await prisma.user.create({ data: { id: `mcp-owner-${suffix}`, email: `owner-${suffix}@example.invalid`, name: `Owner ${suffix}`, password: "not-a-real-login" } });
      await prisma.business.create({ data: { id: `mcp-business-${suffix}`, slug: `mcp-fixture-${suffix}`, name: `MCP Fixture ${suffix}`, ownerId: `mcp-owner-${suffix}`, apiKey: `private-api-key-${suffix}`,
        slotInterval: 30, allowSameDayBookings: true, subscription: { create: { plan: "EQUIPO", status: "ACTIVE" } },
        locations: { create: { id: `mcp-location-${suffix}`, slug: "principal", name: "Principal", timezone: "America/Santiago", isPrimary: true, isActive: true,
          hours: { create: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "09:00", endTime: "18:00", isOpen: true, breakStart: "13:00", breakEnd: "14:00" })) } } },
        services: { create: { id: `mcp-service-${suffix}`, name: `Service ${suffix}`, duration: 60, price: 20000, locations: { create: { locationId: `mcp-location-${suffix}` } } } } } });
      await prisma.staff.create({ data: { id: `mcp-staff-${suffix}`, name: `Staff ${suffix}`, businessId: `mcp-business-${suffix}`, locations: { create: { locationId: `mcp-location-${suffix}` } } } });
    }
    await prisma.user.create({ data: { id: "mcp-employee", email: "employee@example.invalid", name: "Employee", role: "STAFF", password: "not-a-real-login" } });
    await prisma.staff.update({ where: { id: "mcp-staff-a" }, data: { userId: "mcp-employee" } });
    await prisma.businessLocation.create({ data: { id: "mcp-secondary", name: "Secondary", slug: "secondary", businessId: "mcp-business-a", isPrimary: false, timezone: "America/Santiago", isActive: true } });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  afterAll(async () => { await new Promise<void>((resolve) => http.close(() => resolve())); await prisma.$disconnect(); });

  it("completes HTTP DCR, authorization with a real signed Puragenda session, consent, PKCE, and MCP discovery", async () => {
    const registered = await fetch(`${origin}/oauth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_name: "Review client", redirect_uris: [redirectUri] }) });
    expect(registered.status).toBe(201); const client = await registered.json();
    const verifier = secret(); const state = secret();
    const query = new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri: redirectUri, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state, resource: `${origin}/mcp`, scope: "account:read agenda:read" });
    const auth = await fetch(`${origin}/oauth/authorize?${query}`, { redirect: "manual" });
    expect(auth.status).toBe(303);
    const requestId = new URL(auth.headers.get("location")!).searchParams.get("id")!;
    const cookie = auth.headers.get("set-cookie")!.split(";")[0];
    const csrf = cookie.split("=")[1];
    const decision = await fetch(`${origin}/oauth/decision`, { method: "POST", redirect: "manual", headers: { Origin: origin, Cookie: `${await sessionCookie()}; ${cookie}` }, body: new URLSearchParams({ requestId, csrf, decision: "approve", businessId: "mcp-business-a" }) });
    expect(decision.status).toBe(303);
    const callback = new URL(decision.headers.get("location")!); expect(callback.searchParams.get("iss")).toBe(origin); expect(callback.searchParams.get("state")).toBe(state);
    const response = await fetch(`${origin}/oauth/token`, { method: "POST", body: new URLSearchParams({ grant_type: "authorization_code", client_id: client.client_id, redirect_uri: redirectUri, code: callback.searchParams.get("code")!, code_verifier: verifier, resource: `${origin}/mcp` }) });
    expect(response.status).toBe(200); const token = await response.json(); expect(token.expires_in).toBe(600);
    const transport = new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${token.access_token}` } } });
    const sdk = new Client({ name: "puragenda-integration-test", version: "1.0" }); await sdk.connect(transport);
    expect((await sdk.listTools()).tools).toHaveLength(30);
    const profile = await sdk.callTool({ name: "get_connected_account", arguments: {} });
    expect(profile).toMatchObject({ structuredContent: { id: expect.any(String), nickname: "MCP Fixture a" } });
    const result = await sdk.callTool({ name: "get_business_profile", arguments: {} });
    expect(result).toMatchObject({ structuredContent: { id: "mcp-business-a" } });
    await sdk.close();
  });
  it("rejects authorization and consent replay, forged CSRF, unregistered redirects and wrong resources", async () => {
    const connected = await link();
    await expect(decideAuthorization({ requestId: connected.flow.request.id, csrf: connected.flow.csrf, userId: "mcp-owner-a", businessId: "mcp-business-a", approve: true })).rejects.toThrow();
    await expect(exchangeToken(connected.params)).rejects.toThrow();
    const params = new URLSearchParams({ response_type: "code", client_id: connected.client.client_id, redirect_uri: "https://evil.test/callback", code_challenge: secret(), code_challenge_method: "S256", state: secret(), resource: `${origin}/mcp`, scope: "account:read" });
    await expect(startAuthorization(params)).rejects.toThrow();
    const decision = await fetch(`${origin}/oauth/decision`, { method: "POST", headers: { Origin: "https://evil.test", Cookie: await sessionCookie() }, body: new URLSearchParams({ requestId: connected.flow.request.id, csrf: "forged", decision: "approve", businessId: "mcp-business-b" }) });
    expect(decision.status).toBe(403);
    const wrong = new URLSearchParams(connected.params); wrong.set("resource", "https://evil.test/mcp"); await expect(exchangeToken(wrong)).rejects.toThrow("invalid_target");
  });
  it("supports Codex loopback callbacks with a callback ID while preserving exact registered redirect matching", async () => {
    vi.stubEnv("MCP_OAUTH_ALLOW_LOOPBACK", "true");
    const redirect = "http://127.0.0.1:32145/callback/BKj9umzr4ef_";
    const client = await registerClient({ client_name: "Codex loopback fixture", redirect_uris: [redirect] });
    const verifier = secret();
    const params = new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri: redirect,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state: secret(), resource: `${origin}/mcp`, scope: "account:read" });
    const changedHost = new URLSearchParams(params); changedHost.set("redirect_uri", redirect.replace("127.0.0.1", "localhost"));
    await expect(startAuthorization(changedHost)).rejects.toThrow("invalid_request");
    const changedPath = new URLSearchParams(params); changedPath.set("redirect_uri", redirect.replace("BKj9umzr4ef_", "other"));
    await expect(startAuthorization(changedPath)).rejects.toThrow("invalid_request");
    const flow = await startAuthorization(params);
    const callback = new URL(await decideAuthorization({ requestId: flow.request.id, csrf: flow.csrf, userId: "mcp-owner-a", businessId: "mcp-business-a", approve: true }));
    expect(callback.origin + callback.pathname).toBe(redirect); expect(callback.searchParams.get("iss")).toBe(origin);
    const token = await exchangeToken(new URLSearchParams({ grant_type: "authorization_code", client_id: client.client_id, redirect_uri: redirect,
      code: callback.searchParams.get("code")!, code_verifier: verifier, resource: `${origin}/mcp` }));
    expect((await identity(token.access_token)).connection.profile.businessId).toBe("mcp-business-a");
  });
  it("returns protocol errors, rejects oversized and hostile requests, and advertises mixed authentication on the wire", async () => {
    const post = (body: string, headers: Record<string, string> = {}) => fetch(`${origin}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers }, body });
    const listed = await post(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }));
    expect(listed.status).toBe(200); const listing = await listed.json();
    expect(listing.result.tools).toHaveLength(30); expect(listing.result.tools.find((t: { name: string }) => t.name === "get_connected_account").securitySchemes).toEqual([{ type: "oauth2", scopes: ["account:read"] }]);
    const unknown = await post(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "unsupported/method", params: {} }));
    expect((await unknown.json()).error.code).toBe(-32601);
    expect((await post("{bad-json")).status).toBe(400);
    expect((await post("x".repeat(32769))).status).toBe(413);
    const invalid = await post("{}", { Authorization: `Bearer ${secret()}` }); expect(invalid.status).toBe(401); expect(invalid.headers.get("www-authenticate")).toContain("resource_metadata");
    expect((await post("{}", { Origin: "https://evil.test" })).status).toBe(403);
  });
  it("prevents scope escalation on refresh and expires authorization codes", async () => {
    const connected = await link("mcp-owner-a", ["account:read"]);
    await expect(exchangeToken(new URLSearchParams({ grant_type: "refresh_token", client_id: connected.client.client_id, refresh_token: connected.token.refresh_token!, resource: `${origin}/mcp`, scope: "account:read appointments:write" }))).rejects.toThrow("invalid_scope");
    const valid = await exchangeToken(new URLSearchParams({ grant_type: "refresh_token", client_id: connected.client.client_id, refresh_token: connected.token.refresh_token!, resource: `${origin}/mcp` }));
    expect(valid.scope).toBe("account:read");
    const row = await prisma.mcpOAuthCode.findFirstOrThrow(); expect(row.consumedAt).not.toBeNull();
    await prisma.mcpOAuthCode.update({ where: { hash: row.hash }, data: { consumedAt: null, expiresAt: new Date("2026-01-01") } });
    await expect(exchangeToken(connected.params)).rejects.toThrow("invalid_grant");
  });
  it("consumes a code on a wrong PKCE attempt and rotates refresh tokens with family revocation on replay", async () => {
    const connected = await link();
    const refreshed = await exchangeToken(new URLSearchParams({ grant_type: "refresh_token", client_id: connected.client.client_id, refresh_token: connected.token.refresh_token!, resource: `${origin}/mcp` }));
    expect(refreshed.refresh_token).not.toBe(connected.token.refresh_token);
    await expect(exchangeToken(new URLSearchParams({ grant_type: "refresh_token", client_id: connected.client.client_id, refresh_token: connected.token.refresh_token!, resource: `${origin}/mcp` }))).rejects.toThrow();
    await expect(identity(refreshed.access_token)).rejects.toThrow("INVALID_TOKEN");
    // The real engine rejects malformed PKCE, not just our input schema.
    const client = await registerClient({ client_name: "PKCE", redirect_uris: [redirectUri] }); const verifier = secret();
    const flow = await startAuthorization(new URLSearchParams({ response_type: "code", client_id: client.client_id, redirect_uri: redirectUri, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", state: secret(), resource: `${origin}/mcp`, scope: "account:read" }));
    const callback = new URL(await decideAuthorization({ requestId: flow.request.id, csrf: flow.csrf, userId: "mcp-owner-a", businessId: "mcp-business-a", approve: true }));
    const body = new URLSearchParams({ grant_type: "authorization_code", client_id: client.client_id, code: callback.searchParams.get("code")!, redirect_uri: redirectUri, code_verifier: secret(), resource: `${origin}/mcp` });
    await expect(exchangeToken(body)).rejects.toThrow(); body.set("code_verifier", verifier); await expect(exchangeToken(body)).rejects.toThrow();
  });
  it("validates expiry, issuer, resource, revocation and password/session-version changes on every access", async () => {
    for (const field of ["issuer", "resource", "accessExpiresAt"] as const) {
      const connected = await link(); await prisma.mcpOAuthToken.update({ where: { accessHash: digest(connected.token.access_token) }, data: { [field]: field === "accessExpiresAt" ? new Date("2026-01-01") : "https://wrong.test" } });
      await expect(identity(connected.token.access_token)).rejects.toThrow("INVALID_TOKEN");
    }
    const connected = await link(); const auth = await identity(connected.token.access_token);
    await revokeToken(new URLSearchParams({ client_id: connected.client.client_id, token: connected.token.access_token }));
    await expect(authorizedContext(auth, "agenda:read")).rejects.toThrow("ACCESS_REVOKED");
    const other = await link(); await prisma.user.update({ where: { id: "mcp-owner-a" }, data: { tokenVersion: { increment: 1 } } });
    await expect(identity(other.token.access_token)).rejects.toThrow("ACCESS_REVOKED");
  });
  it("isolates owners A/B, validates chosen-business membership, and refuses foreign appointment IDs", async () => {
    const a = await identity((await link()).token.access_token); const b = await identity((await link("mcp-owner-b", Object.keys(SCOPES), "mcp-business-b")).token.access_token);
    expect(await tool("get_business_profile", {}, a)).toMatchObject({ id: "mcp-business-a" }); expect(await tool("get_business_profile", {}, b)).toMatchObject({ id: "mcp-business-b" });
    await expect(link("mcp-owner-a", ["account:read"], "mcp-business-b")).rejects.toThrow("ACCESS_REVOKED");
    await expect(tool("get_appointment_details", { appointmentId: "foreign", locationId: "mcp-location-b" }, a)).rejects.toThrow("LOCATION_FORBIDDEN");
    await expect(tool("get_client_summary", { clientId: "foreign" }, a)).rejects.toThrow("CLIENT_NOT_FOUND");
  });
  it("restricts professionals to assigned locations and their agenda; role strings cannot restore revoked membership", async () => {
    const connected = await link("mcp-employee"); const auth = await identity(connected.token.access_token);
    await expect(authorizedContext(auth, "agenda:read", "mcp-secondary")).rejects.toThrow("LOCATION_FORBIDDEN");
    await expect(tool("get_available_slots", { date: "2026-10-01", serviceId: "mcp-service-a", staffId: "mcp-staff-b", selectedOptionAlternativeIds: [] }, auth)).rejects.toThrow("STAFF_FORBIDDEN");
    await expect(tool("search_clients", { query: "Client" }, auth)).rejects.toThrow("BUSINESS_WIDE_ACCESS_REQUIRED");
    await prisma.locationService.create({ data: { serviceId: "mcp-service-a", locationId: "mcp-secondary" } });
    await prisma.service.create({ data: { id: "mcp-secondary-only-service", businessId: "mcp-business-a", name: "Secondary only", price: 1, duration: 30, locations: { create: { locationId: "mcp-secondary" } } } });
    await prisma.staff.update({ where: { id: "mcp-staff-a" }, data: { services: { connect: [{ id: "mcp-service-a" }, { id: "mcp-secondary-only-service" }] } } });
    expect(JSON.stringify(await tool("list_services", {}, auth))).not.toContain("mcp-secondary");
    const staff = await tool("list_staff", {}, auth) as { staff: Array<{ locationIds: string[]; serviceIds: string[] }> };
    expect(staff.staff[0].locationIds).toEqual(["mcp-location-a"]); expect(staff.staff[0].serviceIds).toEqual(["mcp-service-a"]);
    await prisma.user.update({ where: { id: "mcp-employee" }, data: { role: "ADMIN" } }); await prisma.staff.update({ where: { id: "mcp-staff-a" }, data: { isActive: false } });
    await expect(identity(connected.token.access_token)).rejects.toThrow("ACCESS_REVOKED");
  });
  it("requires OAuth scopes in addition to internal financial and client permissions", async () => {
    const auth = await identity((await link("mcp-owner-a", ["account:read", "agenda:read"])).token.access_token);
    await expect(tool("get_revenue_summary", { period: "this_month" }, auth)).rejects.toThrow("INSUFFICIENT_SCOPE");
    await expect(tool("search_clients", { query: "Client" }, auth)).rejects.toThrow("INSUFFICIENT_SCOPE");
    const employee = await identity((await link("mcp-employee")).token.access_token);
    await prisma.accessProfile.create({ data: { id: "mcp-profile", businessId: "mcp-business-a", name: "Agenda only", permissions: ["appointments.view_own"] } });
    await prisma.staff.update({ where: { id: "mcp-staff-a" }, data: { accessProfileId: "mcp-profile" } });
    await expect(tool("get_revenue_summary", { period: "this_month" }, employee)).rejects.toThrow("FORBIDDEN");
  });
  it("prepares an encrypted, expiring quote; requires browser approval; creates once and replays with no duplicate notifications", async () => {
    const auth = await identity((await link()).token.access_token);
    const prepared = await prepareCreation(creationSchema.parse(creation), auth);
    const stored = await prisma.mcpOperation.findUniqueOrThrow({ where: { tokenHash: digest(prepared.receipt) } });
    expect(stored.encryptedPayload).not.toContain(creation.customerEmail);
    expect(await prepareCreation(creationSchema.parse(creation), auth)).toEqual(prepared);
    await expect(executeOperation(prepared.receipt, "create", auth)).rejects.toThrow("BROWSER_APPROVAL_REQUIRED");
    const b = await identity((await link("mcp-owner-b", Object.keys(SCOPES), "mcp-business-b")).token.access_token);
    await expect(executeOperation(prepared.receipt, "create", b)).rejects.toThrow("OPERATION_FORBIDDEN");
    await approve(prepared.receipt, "mcp-owner-a");
    const result = await executeOperation(prepared.receipt, "create", auth);
    expect(result).toMatchObject({ httpStatus: 201, status: "PENDING", booking: { price: 20000, duration: 60, state: "pending" } });
    expect(await executeOperation(prepared.receipt, "create", auth)).toEqual(result);
    expect(await prisma.appointment.count({ where: { businessId: "mcp-business-a" } })).toBe(1); expect(providers.notify).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(await tool("get_appointment_details", { appointmentId: (result as { id: string }).id }, auth));
    expect(serialized).not.toContain("customerEmail"); expect(serialized).not.toContain("internalNotes");
  });
  it("revalidates prepared prices and availability, protects simultaneous bookings and rejects expired receipts", async () => {
    const auth = await identity((await link()).token.access_token);
    const prepared = await prepareCreation(creationSchema.parse(creation), auth); await approve(prepared.receipt, "mcp-owner-a");
    await prisma.service.update({ where: { id: "mcp-service-a" }, data: { price: 25000 } });
    expect(await executeOperation(prepared.receipt, "create", auth)).toMatchObject({ httpStatus: 409, code: "SELECTION_CHANGED" });
    expect(await prisma.appointment.count({ where: { businessId: "mcp-business-a" } })).toBe(0);
    const one = await prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID() }), auth);
    const two = await prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID() }), auth);
    await approve(one.receipt, "mcp-owner-a"); await approve(two.receipt, "mcp-owner-a");
    const results = await Promise.all([executeOperation(one.receipt, "create", auth), executeOperation(two.receipt, "create", auth)]);
    expect(results.map((r) => (r as { httpStatus: number }).httpStatus).sort()).toEqual([201, 409]);
    const expiring = await prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID(), startTime: "2026-10-01T14:00:00.000Z" }), auth);
    await prisma.mcpOperation.update({ where: { tokenHash: digest(expiring.receipt) }, data: { expiresAt: new Date("2026-01-01") } });
    await expect(executeOperation(expiring.receipt, "create", auth)).rejects.toThrow("OPERATION_EXPIRED");
  });
  it("keeps an in-progress retry recoverable and never reruns effects after approval expiry", async () => {
    const auth = await identity((await link()).token.access_token);
    const preparation = await prepareCreation(creationSchema.parse(creation), auth); await approve(preparation.receipt, "mcp-owner-a");
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const notified = new Promise<void>((resolve) => { started = resolve; });
    providers.notify.mockImplementationOnce(async () => { started(); await gate; });
    const first = executeOperation(preparation.receipt, "create", auth); await notified;
    const concurrent = await executeOperation(preparation.receipt, "create", auth);
    expect(concurrent).toMatchObject({ httpStatus: 409, code: "BOOKING_IN_PROGRESS", retryWithSameReceipt: true });
    release(); const result = await first as { id: string };
    expect(await executeOperation(preparation.receipt, "create", auth)).toEqual(result);
    await prisma.mcpOperation.update({ where: { tokenHash: digest(preparation.receipt) }, data: { state: "EXECUTING", expiresAt: new Date("2026-01-01") } });
    expect(await executeOperation(preparation.receipt, "create", auth)).toMatchObject({ id: result.id, httpStatus: 201 });
    expect(providers.notify).toHaveBeenCalledTimes(1);
  });
  it("moves and cancels through shared services with snapshot checks and atomic idempotent results", async () => {
    const auth = await identity((await link()).token.access_token);
    const p = await prepareCreation(creationSchema.parse(creation), auth); await approve(p.receipt, "mcp-owner-a");
    const created = await executeOperation(p.receipt, "create", auth) as { id: string };
    const move = await prepareMutation("reschedule", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a", startTime: "2026-10-01T14:00:00Z" }, auth);
    await approve(move.receipt, "mcp-owner-a"); expect(await executeOperation(move.receipt, "reschedule", auth)).toMatchObject({ startTime: "2026-10-01T14:00:00.000Z" });
    const cancel = await prepareMutation("cancel", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a" }, auth);
    await approve(cancel.receipt, "mcp-owner-a"); const result = await executeOperation(cancel.receipt, "cancel", auth);
    expect(result).toMatchObject({ status: "CANCELLED" }); expect(await executeOperation(cancel.receipt, "cancel", auth)).toEqual(result);
  });
  it("refuses stale snapshots, approved deposits, unauthorized approvals and revoked public participation", async () => {
    const auth = await identity((await link()).token.access_token);
    const createdPreparation = await prepareCreation(creationSchema.parse(creation), auth); await approve(createdPreparation.receipt, "mcp-owner-a");
    const created = await executeOperation(createdPreparation.receipt, "create", auth) as { id: string };
    const cancellation = await prepareMutation("cancel", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a" }, auth);
    const wrongUser = await approvalGet(new NextRequest(`${origin}/mcp/confirm/${cancellation.receipt}`, { headers: { Cookie: await sessionCookie("mcp-owner-b") } }), { params: Promise.resolve({ receipt: cancellation.receipt }) });
    expect(await wrongUser.text()).not.toContain('name="csrf"');
    await approve(cancellation.receipt, "mcp-owner-a");
    await prisma.appointment.update({ where: { id: created.id }, data: { customerName: "Updated elsewhere" } });
    await expect(executeOperation(cancellation.receipt, "cancel", auth)).rejects.toThrow("APPOINTMENT_CHANGED");
    await prisma.appointment.update({ where: { id: created.id }, data: { paymentStatus: "APPROVED", depositAmount: 5000 } });
    await expect(prepareMutation("cancel", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a" }, auth)).rejects.toThrow("MANUAL_RESOLUTION_REQUIRED");
    await prisma.business.update({ where: { id: "mcp-business-a" }, data: { mcpPublicDiscovery: true } });
    await prisma.service.update({ where: { id: "mcp-service-a" }, data: { price: 0 } });
    const free = await prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID(), startTime: "2026-10-01T14:00:00Z" }), null, "mcp-fixture-a"); await approve(free.receipt);
    await prisma.business.update({ where: { id: "mcp-business-a" }, data: { mcpPublicDiscovery: false } });
    await expect(executeOperation(free.receipt, "public_create", null)).rejects.toThrow("BUSINESS_NOT_FOUND");
  });
  it("reuses Puri's exact registered-payment totals, keeps reserved value distinct, and never returns private notes", async () => {
    const auth = await identity((await link()).token.access_token);
    for (const [index, data] of [{ totalPrice: 20000, paymentStatus: "APPROVED" as const, depositAmount: 5000 }, { totalPrice: 30000, paymentStatus: "NONE" as const, depositAmount: null }].entries()) {
      await prisma.appointment.create({ data: { id: `mcp-stat-${index}`, businessId: "mcp-business-a", locationId: "mcp-location-a", serviceId: "mcp-service-a", staffId: "mcp-staff-a",
        customerName: "Stats fixture", customerEmail: "stats@example.invalid", internalNotes: "NEVER_SHARE_PRIVATE_NOTES", status: "CONFIRMED", startTime: new Date(`2026-09-30T${index ? "14" : "12"}:00:00Z`), endTime: new Date(`2026-09-30T${index ? "15" : "13"}:00:00Z`), ...data } });
    }
    expect(await tool("get_revenue_summary", { period: "today" }, auth)).toMatchObject({ due: 50000, collected: 5000, pending: 45000, currencyCode: "CLP", appointments: 2 });
    const services = await tool("get_popular_services", { period: "today" }, auth) as { services: Array<{ bookedValue: number }> };
    expect(services.services[0].bookedValue).toBe(50000);
    const noMoney = await identity((await link("mcp-owner-a", ["account:read", "agenda:read"])).token.access_token);
    const appointments = JSON.stringify(await tool("list_appointments", { period: "today" }, noMoney));
    expect(appointments).not.toContain("NEVER_SHARE_PRIVATE_NOTES"); expect(appointments).not.toContain("totalPrice");
  });
  it("excludes nonparticipants and private data; allows free public bookings while rejecting paid or deposit bookings", async () => {
    expect((await searchPublicBusinesses("MCP")).businesses).toEqual([]);
    await expect(publicCatalog("mcp-fixture-a")).rejects.toThrow("BUSINESS_NOT_FOUND");
    await prisma.business.update({ where: { id: "mcp-business-a" }, data: { mcpPublicDiscovery: true } });
    expect((await searchPublicBusinesses("MCP")).businesses.map((b) => b.id)).toEqual(["mcp-business-a"]);
    expect(JSON.stringify(await publicCatalog("mcp-fixture-a"))).not.toContain("private-api-key");
    await expect(prepareCreation(creationSchema.parse(creation), null, "mcp-fixture-a")).rejects.toThrow("PAID_PUBLIC_BOOKING_UNAVAILABLE");
    await prisma.service.update({ where: { id: "mcp-service-a" }, data: { price: 0 } });
    const free = await prepareCreation(creationSchema.parse(creation), null, "mcp-fixture-a"); await approve(free.receipt);
    expect(await executeOperation(free.receipt, "public_create", null)).toMatchObject({ httpStatus: 201, booking: { price: 0 } });
    const availability = await publicAvailability("mcp-fixture-a", { date: "2026-10-01", serviceId: "mcp-service-a", staffId: "mcp-staff-a", selectedOptionAlternativeIds: [] });
    expect(availability.slots.some((s) => s.startTime === startTime)).toBe(false);
    await prisma.apiRateLimitBucket.update({ where: { key: digest("mcp:public-availability:business:mcp-business-a") }, data: { count: 60 } });
    await expect(publicAvailability("mcp-fixture-a", { date: "2026-10-01", serviceId: "mcp-service-a", staffId: "mcp-staff-a", selectedOptionAlternativeIds: [] })).rejects.toThrow("RATE_LIMITED");
    await prisma.business.update({ where: { id: "mcp-business-a" }, data: { depositRequired: true } });
    await expect(prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID(), startTime: "2026-10-01T14:00:00Z" }), null, "mcp-fixture-a")).rejects.toThrow("DEPOSIT_BOOKING_UNAVAILABLE");
  });
  it("executes every one of the 30 tools through the official HTTP MCP client", async () => {
    const linked = await link();
    await prisma.client.create({ data: { id: "mcp-readable-client", businessId: "mcp-business-a", name: "Cliente ficticio", email: "fixture@example.invalid" } });
    await prisma.appointment.create({ data: { id: "mcp-readable-appointment", businessId: "mcp-business-a", locationId: "mcp-location-a", serviceId: "mcp-service-a", staffId: "mcp-staff-a", clientId: "mcp-readable-client",
      customerName: "Cliente ficticio", customerEmail: "fixture@example.invalid", status: "CONFIRMED", startTime: new Date("2026-09-30T15:00:00Z"), endTime: new Date("2026-09-30T16:00:00Z"), totalPrice: 10000 } });
    const sdk = new Client({ name: "all-tools-regression", version: "1" });
    await sdk.connect(new StreamableHTTPClientTransport(new URL(`${origin}/mcp`), { requestInit: { headers: { Authorization: `Bearer ${linked.token.access_token}` } } }));
    const exercised = new Set<string>();
    const invoke = async (name: string, args: Record<string, unknown> = {}) => {
      const result = await sdk.callTool({ name, arguments: args });
      expect(result.isError, `${name}: ${JSON.stringify(result.content)}`).not.toBe(true);
      expect(result.structuredContent).toBeTypeOf("object"); exercised.add(name);
      return result.structuredContent as Record<string, unknown>;
    };
    try {
      const inputs: Record<string, Record<string, unknown>> = {
        get_connected_account: {}, get_business_profile: {}, list_accessible_locations: {}, get_today_overview: {},
        list_appointments: { period: "today" }, get_appointment_details: { appointmentId: "mcp-readable-appointment" },
        get_available_slots: { date: "2026-10-01", serviceId: "mcp-service-a", staffId: "mcp-staff-a" }, list_services: {}, list_staff: {},
        search_clients: { query: "Cliente" }, get_client_summary: { clientId: "mcp-readable-client" }, get_client_activity: { sort: "frequent" },
        get_revenue_summary: { period: "this_month" }, compare_periods: { current: "this_month", previous: "previous_month" },
        get_popular_services: { period: "this_month" }, get_staff_performance: { period: "this_month" }, get_loyalty_summary: {}, get_gift_cards_summary: {},
      };
      for (const [name, args] of Object.entries(inputs)) await invoke(name, args);
      const prepared = await invoke("prepare_appointment_creation", { ...creation, operationKey: randomUUID() }); await approve(String(prepared.receipt), "mcp-owner-a");
      const created = await invoke("create_appointment", { receipt: prepared.receipt });
      const move = await invoke("prepare_appointment_reschedule", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a", startTime: "2026-10-01T14:00:00Z" }); await approve(String(move.receipt), "mcp-owner-a");
      await invoke("reschedule_appointment", { receipt: move.receipt });
      const cancellation = await invoke("prepare_appointment_cancellation", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a" }); await approve(String(cancellation.receipt), "mcp-owner-a");
      expect(await invoke("cancel_appointment", { receipt: cancellation.receipt })).toMatchObject({ status: "CANCELLED" });
      await prisma.business.update({ where: { id: "mcp-business-a" }, data: { mcpPublicDiscovery: true } }); await prisma.service.update({ where: { id: "mcp-service-a" }, data: { price: 0 } });
      await invoke("search_public_businesses", { query: "MCP" }); await invoke("get_public_business_details", { slug: "mcp-fixture-a" }); await invoke("get_public_service_catalog", { slug: "mcp-fixture-a" });
      await invoke("get_public_availability", { slug: "mcp-fixture-a", date: "2026-10-01", serviceId: "mcp-service-a", staffId: "mcp-staff-a" });
      const publicPrepared = await invoke("prepare_public_booking", { ...creation, operationKey: randomUUID(), slug: "mcp-fixture-a", startTime: "2026-10-01T17:00:00Z" }); await approve(String(publicPrepared.receipt));
      expect(await invoke("confirm_public_booking", { receipt: publicPrepared.receipt })).toMatchObject({ httpStatus: 201 });
      expect([...exercised].sort()).toEqual((await sdk.listTools()).tools.map((t) => t.name).sort());
    } finally { await sdk.close(); }
  }, 30000);
  it("keeps public writes disabled by default and rechecks the switch after browser approval", async () => {
    await prisma.business.update({ where: { id: "mcp-business-a" }, data: { mcpPublicDiscovery: true } });
    await prisma.service.update({ where: { id: "mcp-service-a" }, data: { price: 0 } });
    vi.stubEnv("MCP_PUBLIC_BOOKING_ENABLED", "");
    expect((await publicCatalog("mcp-fixture-a")).capabilities.mcpBooking).toBe(false);
    expect((await searchPublicBusinesses("MCP")).businesses).toHaveLength(1);
    await expect(prepareCreation(creationSchema.parse(creation), null, "mcp-fixture-a")).rejects.toThrow("PUBLIC_BOOKING_DISABLED");
    vi.stubEnv("MCP_PUBLIC_BOOKING_ENABLED", "true");
    const prepared = await prepareCreation(creationSchema.parse(creation), null, "mcp-fixture-a"); await approve(prepared.receipt);
    vi.stubEnv("MCP_PUBLIC_BOOKING_ENABLED", "false");
    await expect(executeOperation(prepared.receipt, "public_create", null)).rejects.toThrow("PUBLIC_BOOKING_DISABLED");
    expect(await prisma.appointment.count({ where: { businessId: "mcp-business-a" } })).toBe(0);
  });
  it("bounds public preparations per contact across caller IPs without charging idempotent preparation retries", async () => {
    await prisma.business.update({ where: { id: "mcp-business-a" }, data: { mcpPublicDiscovery: true } });
    await prisma.service.update({ where: { id: "mcp-service-a" }, data: { price: 0 } });
    const firstArgs = creationSchema.parse(creation);
    const first = await prepareCreation(firstArgs, null, "mcp-fixture-a");
    for (let n = 0; n < 8; n++) expect(await prepareCreation(firstArgs, null, "mcp-fixture-a")).toEqual(first);
    for (let n = 1; n < 5; n++) await prepareCreation({ ...firstArgs, operationKey: randomUUID() }, null, "mcp-fixture-a");
    await expect(prepareCreation({ ...firstArgs, operationKey: randomUUID(), customerPhone: "+56922222222" }, null, "mcp-fixture-a")).rejects.toThrow("RATE_LIMITED");
    await expect(prepareCreation({ ...firstArgs, operationKey: randomUUID(), customerEmail: "other@example.invalid" }, null, "mcp-fixture-a")).rejects.toThrow("RATE_LIMITED");
    expect(await prepareCreation({ ...firstArgs, operationKey: randomUUID(), customerEmail: "other@example.invalid", customerPhone: "+56922222222" }, null, "mcp-fixture-a")).toHaveProperty("receipt");
  });
  it("lets only an authenticated superadmin release and pause businesses through the audited action", async () => {
    vi.stubEnv("MCP_REVIEW_USER_IDS", "mcp-owner-a"); vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "mcp-business-a");
    const enable = { enabled: true, expectedVersion: 0, approvalConfirmed: true, approvalReference: "fictitious-approval-for-local-test" };
    await expect(setMcpBusinessAccess(enable)).rejects.toThrow("Acceso denegado");
    const ordinary = await prisma.user.findUniqueOrThrow({ where: { id: "mcp-owner-b" } });
    providers.adminCookies.set(AUTH_COOKIE_NAME, createSessionToken({ ...ordinary, adminAccess: false }));
    await expect(setMcpBusinessAccess(enable)).rejects.toThrow("Acceso denegado");
    providers.adminCookies.clear();
    const admin = await prisma.user.update({ where: { id: "mcp-owner-a" }, data: { isSuperAdmin: true } });
    const session = await createSuperAdminSession({ user: admin });
    providers.adminCookies.set(ADMIN_AUTH_COOKIE_NAME, session.token);
    expect(await setMcpBusinessAccess({ ...enable, approvalConfirmed: false })).toHaveProperty("error");
    expect(await setMcpBusinessAccess(enable)).toEqual({ success: true });
    expect((await identity((await link("mcp-owner-b", Object.keys(SCOPES), "mcp-business-b")).token.access_token)).connection.profile.businessId).toBe("mcp-business-b");
    expect(await setMcpBusinessAccess({ enabled: false, expectedVersion: 1 })).toEqual({ success: true });
    expect(await setMcpBusinessAccess(enable)).toHaveProperty("error");
    await expect(link("mcp-owner-b", Object.keys(SCOPES), "mcp-business-b")).rejects.toThrow("MCP_NOT_AVAILABLE");
    expect((await identity((await link()).token.access_token)).connection.profile.businessId).toBe("mcp-business-a");
    expect(await prisma.auditLog.count({ where: { userId: admin.id, action: { in: ["MCP_BUSINESS_ACCESS_ENABLED", "MCP_BUSINESS_ACCESS_PAUSED"] } } })).toBe(2);
  });
  it("keeps a legitimate non-review owner out of OAuth and the settings card before release", async () => {
    vi.stubEnv("MCP_REVIEW_USER_IDS", "mcp-owner-a"); vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "mcp-business-a");
    await expect(link("mcp-owner-b", Object.keys(SCOPES), "mcp-business-b")).rejects.toThrow("MCP_NOT_AVAILABLE");
    expect(await McpConnections({ userId: "mcp-owner-b", businessId: "mcp-business-b", owner: true, publicDiscovery: false })).toBeNull();
    expect(await prisma.mcpConnection.count()).toBe(0);
    expect(await prisma.appointment.count()).toBe(0);
    expect((await identity((await link()).token.access_token)).connection.profile.businessId).toBe("mcp-business-a");
  });
  it("rechecks a release pause for existing tokens and approved writes, while reviewers keep working", async () => {
    vi.stubEnv("MCP_REVIEW_USER_IDS", "mcp-owner-a"); vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "mcp-business-a");
    await prisma.mcpRolloutState.create({ data: { id: "global", businessAccessEnabled: true, approvalReference: "fictitious-test-approval", approvedAt: new Date(), version: 1 } });
    const linked = await link("mcp-owner-b", Object.keys(SCOPES), "mcp-business-b");
    const auth = await identity(linked.token.access_token);
    const prepared = await prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID(), locationId: "mcp-location-b", serviceId: "mcp-service-b", staffId: "mcp-staff-b" }), auth);
    await approve(prepared.receipt, "mcp-owner-b");
    await prisma.mcpRolloutState.update({ where: { id: "global" }, data: { businessAccessEnabled: false, version: 2 } });
    await expect(identity(linked.token.access_token)).rejects.toThrow("MCP_NOT_AVAILABLE");
    await expect(tool("get_connected_account", {}, auth)).rejects.toThrow("MCP_NOT_AVAILABLE");
    await expect(executeOperation(prepared.receipt, "create", auth)).rejects.toThrow("MCP_NOT_AVAILABLE");
    expect(await prisma.appointment.count()).toBe(0);
    expect((await identity((await link()).token.access_token)).connection.profile.businessId).toBe("mcp-business-a");
  });
  it("filters anonymous discovery and direct public writes to review businesses even with existing opt-ins", async () => {
    await prisma.business.updateMany({ data: { mcpPublicDiscovery: true } });
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "mcp-business-a");
    expect((await searchPublicBusinesses("MCP")).businesses.map(row => row.id)).toEqual(["mcp-business-a"]);
    await expect(publicCatalog("mcp-fixture-b")).rejects.toThrow("BUSINESS_NOT_FOUND");
    await expect(prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID() }), null, "mcp-fixture-b")).rejects.toThrow("BUSINESS_NOT_FOUND");
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "");
    expect((await searchPublicBusinesses("MCP")).businesses).toEqual([]);
  });
  it("enforces the singleton and approval requirement in the real database", async () => {
    await expect(prisma.mcpRolloutState.create({ data: { id: "global", businessAccessEnabled: true } })).rejects.toThrow();
    await expect(prisma.mcpRolloutState.create({ data: { id: "another", businessAccessEnabled: false } })).rejects.toThrow();
    expect(await prisma.mcpRolloutState.count()).toBe(0);
  });
  it("saves the review lifecycle without notifications, future reminders or calendar writes", async () => {
    vi.stubEnv("MCP_REVIEW_SUPPRESS_EFFECTS", "true");
    const auth = await identity((await link()).token.access_token);
    const prepared = await prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID() }), auth);
    expect(prepared.summary).toMatchObject({ reviewMode: true });
    await approve(prepared.receipt, "mcp-owner-a");
    const created = await executeOperation(prepared.receipt, "create", auth) as { id: string };
    expect(created).toMatchObject({ httpStatus: 201, externalEffects: "suppressed_review" });
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: created.id } })).reminderSent).toBe(true);
    const move = await prepareMutation("reschedule", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a", startTime: "2026-10-01T14:00:00Z" }, auth);
    await approve(move.receipt, "mcp-owner-a");
    expect(await executeOperation(move.receipt, "reschedule", auth)).toMatchObject({ calendarSync: "suppressed_review" });
    const cancel = await prepareMutation("cancel", { operationKey: randomUUID(), appointmentId: created.id, locationId: "mcp-location-a" }, auth);
    await approve(cancel.receipt, "mcp-owner-a");
    expect(await executeOperation(cancel.receipt, "cancel", auth)).toMatchObject({ status: "CANCELLED", calendarSync: "suppressed_review" });
    expect(providers.notify).not.toHaveBeenCalled(); expect(providers.sync).not.toHaveBeenCalled();
    // Ordinary businesses retain their real notification contract even with
    // review suppression configured globally.
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "mcp-business-a");
    await prisma.mcpRolloutState.create({ data: { id: "global", businessAccessEnabled: true, approvedAt: new Date(), approvalReference: "fictitious-approval" } });
    const other = await identity((await link("mcp-owner-b", Object.keys(SCOPES), "mcp-business-b")).token.access_token);
    const ordinary = await prepareCreation(creationSchema.parse({ ...creation, operationKey: randomUUID(), locationId: "mcp-location-b", serviceId: "mcp-service-b", staffId: "mcp-staff-b" }), other);
    await approve(ordinary.receipt, "mcp-owner-b"); await executeOperation(ordinary.receipt, "create", other);
    expect(providers.notify).toHaveBeenCalledOnce(); expect(providers.sync).toHaveBeenCalledOnce();
  });
  it("uses shared durable rate limits, clears expired encrypted payloads, and enables database RLS", async () => {
    await limit("fixture", 1); await expect(limit("fixture", 1)).rejects.toThrow("RATE_LIMITED");
    const auth = await identity((await link()).token.access_token); const p = await prepareCreation(creationSchema.parse(creation), auth);
    await prisma.mcpOperation.update({ where: { tokenHash: digest(p.receipt) }, data: { createdAt: new Date("2026-09-28") } });
    expect((await cleanupMcpData()).payloads).toBe(1);
    expect((await prisma.mcpOperation.findUniqueOrThrow({ where: { tokenHash: digest(p.receipt) } })).encryptedPayload).toBe("");
    const sql = new pg.Client({ connectionString: database }); await sql.connect();
    const rows = await sql.query("SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND relname LIKE 'Mcp%' AND relkind='r'");
    expect(rows.rows).toHaveLength(8); expect(rows.rows.every((r) => r.relrowsecurity)).toBe(true);
    const schema = new URL(database!).searchParams.get("schema")!;
    const role = `mcp_role_${schema.replace("booking_api_test_", "")}`;
    try {
      await sql.query(`CREATE ROLE "${role}" NOLOGIN`);
      await sql.query(`GRANT USAGE ON SCHEMA "${schema}" TO "${role}"`);
      await sql.query(`GRANT SELECT ON "McpOAuthToken" TO "${role}"`);
      await sql.query(`GRANT SELECT ON "McpRolloutState" TO "${role}"`);
      await sql.query("BEGIN"); await sql.query(`SET LOCAL ROLE "${role}"`);
      expect((await sql.query('SELECT * FROM "McpOAuthToken"')).rows).toHaveLength(0);
      expect((await sql.query('SELECT * FROM "McpRolloutState"')).rows).toHaveLength(0);
      await expect(sql.query('DELETE FROM "McpOAuthToken"')).rejects.toMatchObject({ code: "42501" });
      await sql.query("ROLLBACK");
    } finally {
      await sql.query("ROLLBACK"); await sql.query(`DROP OWNED BY "${role}"`); await sql.query(`DROP ROLE "${role}"`); await sql.end();
    }
  });
});
