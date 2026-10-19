import OAuth2Server from "@node-oauth/oauth2-server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { membership } from "./access";
import { allowedRedirect, mcpConfig, parseScopes, SCOPES } from "./config";
import { digest, McpError, secret } from "./security";

const clientShape = (client: { id: string; redirectUris: string[] }) => ({ id: client.id, redirectUris: client.redirectUris, grants: ["authorization_code", "refresh_token"] });
const connectionInclude = { profile: true, client: true } as const;

// The maintained OAuth engine owns code flow, PKCE S256, redirect and scope
// validation. This adapter owns durable grants, tenant policy and replay fencing.
function oauthEngine(db: Prisma.TransactionClient, resource: string, clientId?: string, connectionId?: string) {
  const valid = async (id: string) => {
    const grant = await db.mcpConnection.findUnique({ where: { id }, include: connectionInclude });
    if (!grant || grant.revokedAt || grant.expiresAt <= new Date()) return null;
    await membership(grant.profile.userId, grant.profile.businessId, grant.tokenVersion);
    return grant;
  };
  const model: OAuth2Server.AuthorizationCodeModel & OAuth2Server.RefreshTokenModel = {
    async getClient(id, clientSecret) {
      if (clientSecret) return false;
      const client = await db.mcpOAuthClient.findUnique({ where: { id } });
      return client ? clientShape(client) : false;
    },
    generateAccessToken: async () => secret(),
    generateRefreshToken: async () => secret(),
    generateAuthorizationCode: async () => secret(),
    async validateScope(_user, _client, scopes) {
      return scopes?.length && scopes.every((scope) => scope in SCOPES) ? scopes : false;
    },
    async validateRedirectUri(uri, client) { return Array.isArray(client.redirectUris) && client.redirectUris.includes(uri) && allowedRedirect(uri); },
    async saveAuthorizationCode(code, client) {
      if (!connectionId || !code.codeChallenge || code.codeChallengeMethod !== "S256") return false;
      await db.mcpOAuthCode.create({ data: { hash: digest(code.authorizationCode), connectionId,
        redirectUri: code.redirectUri, challenge: code.codeChallenge, expiresAt: code.expiresAt } });
      return { ...code, client, user: { connectionId } };
    },
    async getAuthorizationCode(raw) {
      const code = await db.mcpOAuthCode.findUnique({ where: { hash: digest(raw) } });
      if (!code || code.consumedAt) return false;
      const grant = await valid(code.connectionId);
      if (!grant) return false;
      return { authorizationCode: raw, expiresAt: code.expiresAt, redirectUri: code.redirectUri, scope: grant.scopes,
        codeChallenge: code.challenge, codeChallengeMethod: "S256", client: clientShape(grant.client), user: { connectionId: grant.id } };
    },
    async revokeAuthorizationCode(code) {
      return (await db.mcpOAuthCode.updateMany({ where: { hash: digest(code.authorizationCode), consumedAt: null }, data: { consumedAt: new Date() } })).count === 1;
    },
    async getRefreshToken(raw) {
      const token = await db.mcpOAuthToken.findUnique({ where: { refreshHash: digest(raw) }, include: { connection: true } });
      if (!token || token.connection.clientId !== clientId) return false;
      if (token.refreshUsedAt) {
        await db.mcpConnection.update({ where: { id: token.connectionId }, data: { revokedAt: new Date() } });
        return false;
      }
      const grant = await valid(token.connectionId);
      if (!grant || token.issuer !== mcpConfig().issuer || token.resource !== resource) return false;
      return { refreshToken: raw, refreshTokenExpiresAt: token.refreshExpiresAt, scope: token.scopes,
        client: clientShape(grant.client), user: { connectionId: grant.id } };
    },
    async revokeToken(token) {
      return (await db.mcpOAuthToken.updateMany({ where: { refreshHash: digest(token.refreshToken), refreshUsedAt: null }, data: { refreshUsedAt: new Date() } })).count === 1;
    },
    async saveToken(token, client, user) {
      const grant = await valid(String(user.connectionId));
      if (!grant || !token.refreshToken || !token.accessTokenExpiresAt || !token.refreshTokenExpiresAt) return false;
      await db.mcpOAuthToken.create({ data: { connectionId: grant.id, accessHash: digest(token.accessToken), refreshHash: digest(token.refreshToken),
        accessExpiresAt: token.accessTokenExpiresAt, refreshExpiresAt: new Date(Math.min(token.refreshTokenExpiresAt.getTime(), grant.expiresAt.getTime())),
        issuer: mcpConfig().issuer, resource, scopes: token.scope ?? grant.scopes } });
      return { ...token, accessToken: token.accessToken, client, user } as OAuth2Server.Token;
    },
    async getAccessToken() { return false; }, // Resource authentication uses opaque-token introspection in access.ts.
  };
  return new OAuth2Server({ model, accessTokenLifetime: 600, refreshTokenLifetime: 30 * 86400, authorizationCodeLifetime: 120,
    requirePKCE: true, requireClientAuthentication: { authorization_code: false, refresh_token: false }, alwaysIssueNewRefreshToken: true });
}

export const authorizationSchema = z.object({
  response_type: z.literal("code"), client_id: z.string().uuid(), redirect_uri: z.string().max(2048),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code_challenge_method: z.literal("S256"),
  state: z.string().min(16).max(1024), resource: z.string().max(2048),
  scope: z.string().max(256).default("account:read agenda:read"),
});
export async function startAuthorization(params: URLSearchParams) {
  assertUnique(params);
  const data = authorizationSchema.parse(Object.fromEntries(params));
  if (data.resource !== mcpConfig().resource) throw new McpError("invalid_target", 400);
  // A stable profile is part of every connection and is explicitly displayed
  // on the consent screen, even when the client initially asks for one tool.
  const scopes = [...new Set(["account:read" as const, ...parseScopes(data.scope)])];
  const client = await prisma.mcpOAuthClient.findUnique({ where: { id: data.client_id } });
  if (!client || !client.redirectUris.includes(data.redirect_uri) || !allowedRedirect(data.redirect_uri)) throw new McpError("invalid_request", 400);
  const csrf = secret();
  const request = await prisma.mcpOAuthRequest.create({ data: { clientId: client.id, redirectUri: data.redirect_uri, scopes,
    state: data.state, resource: data.resource, challenge: data.code_challenge, csrfHash: digest(csrf), expiresAt: new Date(Date.now() + 600000) } });
  return { request, csrf };
}

export async function authorizationRequest(id: string, csrf: string) {
  const request = await prisma.mcpOAuthRequest.findUnique({ where: { id }, include: { client: true } });
  if (!request || request.csrfHash !== digest(csrf) || request.consumedAt || request.expiresAt <= new Date()) throw new McpError("INVALID_AUTHORIZATION_REQUEST", 400);
  return request;
}

export async function decideAuthorization(input: { requestId: string; csrf: string; userId: string; businessId?: string; approve: boolean }) {
  const request = await authorizationRequest(input.requestId, input.csrf);
  const callback = new URL(request.redirectUri);
  callback.searchParams.set("state", request.state);
  callback.searchParams.set("iss", mcpConfig().issuer);
  if (!input.approve) {
    await prisma.mcpOAuthRequest.updateMany({ where: { id: request.id, consumedAt: null }, data: { consumedAt: new Date() } });
    callback.searchParams.set("error", "access_denied");
    return callback.href;
  }
  if (!input.businessId) throw new McpError("BUSINESS_REQUIRED", 400);
  const access = await membership(input.userId, input.businessId);
  if (!access.permissions.length || !access.locations.length) throw new McpError("FORBIDDEN");
  return prisma.$transaction(async (db) => {
    const consumed = await db.mcpOAuthRequest.updateMany({ where: { id: request.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (!consumed.count) throw new McpError("AUTHORIZATION_REPLAY", 400);
    const profile = await db.mcpProfile.upsert({ where: { userId_businessId: { userId: input.userId, businessId: access.business.id } },
      create: { userId: input.userId, businessId: access.business.id }, update: {} });
    const connection = await db.mcpConnection.create({ data: { profileId: profile.id, clientId: request.clientId,
      scopes: request.scopes, tokenVersion: access.user.tokenVersion, expiresAt: new Date(Date.now() + 30 * 86400000) } });
    const engine = oauthEngine(db, request.resource, request.clientId, connection.id);
    const response = new OAuth2Server.Response();
    const code = await engine.authorize(new OAuth2Server.Request({ method: "GET", headers: {}, body: {}, query: {
      response_type: "code", client_id: request.clientId, redirect_uri: request.redirectUri, state: request.state,
      scope: request.scopes.join(" "), code_challenge: request.challenge, code_challenge_method: "S256",
    } }), response, { authenticateHandler: { handle: async () => ({ connectionId: connection.id }) } });
    callback.searchParams.set("code", code.authorizationCode);
    await db.auditLog.create({ data: { userId: input.userId, action: "MCP_CONNECTION_AUTHORIZED", details: JSON.stringify({ connectionId: connection.id, businessId: access.business.id, scopes: request.scopes }) } });
    return callback.href;
  });
}

export function assertUnique(params: URLSearchParams) {
  if ([...new Set(params.keys())].some((key) => params.getAll(key).length !== 1)) throw new McpError("invalid_request", 400);
}

export async function exchangeToken(body: URLSearchParams) {
  assertUnique(body);
  const data = z.object({ grant_type: z.enum(["authorization_code", "refresh_token"]), client_id: z.string().uuid(), resource: z.string().max(2048),
    code: z.string().max(128).optional(), redirect_uri: z.string().max(2048).optional(), code_verifier: z.string().max(128).optional(),
    refresh_token: z.string().max(128).optional(), scope: z.string().max(256).optional() }).strict().parse(Object.fromEntries(body));
  if (data.resource !== mcpConfig().resource) throw new McpError("invalid_target", 400);
  if (data.grant_type === "authorization_code" && (!data.redirect_uri || !allowedRedirect(data.redirect_uri))) throw new McpError("invalid_grant", 400);
  const outcome = await prisma.$transaction(async (db) => {
    const credential = data.grant_type === "authorization_code" ? data.code : data.refresh_token;
    if (!credential) return { error: "invalid_grant" };
    await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`mcp-token:${digest(credential)}`}, 0))::text`;
    try {
      const response = new OAuth2Server.Response();
      const token = await oauthEngine(db, data.resource, data.client_id).token(new OAuth2Server.Request({ method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "content-length": String(Buffer.byteLength(body.toString())) }, query: {}, body: data }), response);
      return { body: { access_token: token.accessToken, token_type: "Bearer", expires_in: 600, refresh_token: token.refreshToken,
        scope: token.scope?.join(" "), resource: data.resource } };
    } catch (error) {
      // Commit consumed codes and refresh replay revocation even on failure.
      return { error: error instanceof OAuth2Server.OAuthError ? error.name : "invalid_grant" };
    }
  });
  if (outcome.error) throw new McpError(outcome.error, outcome.error === "server_error" ? 503 : 400);
  return outcome.body!;
}

export async function revokeToken(body: URLSearchParams) {
  assertUnique(body);
  const data = z.object({ client_id: z.string().uuid(), token: z.string().min(1).max(128), token_type_hint: z.enum(["access_token", "refresh_token"]).optional() }).strict().parse(Object.fromEntries(body));
  const token = await prisma.mcpOAuthToken.findFirst({ where: { OR: [{ accessHash: digest(data.token) }, { refreshHash: digest(data.token) }], connection: { clientId: data.client_id } } });
  if (token) await prisma.mcpConnection.update({ where: { id: token.connectionId }, data: { revokedAt: new Date() } });
}

export const registrationSchema = z.object({
  client_name: z.string().trim().min(1).max(100), redirect_uris: z.array(z.string().max(2048)).min(1).max(5),
  token_endpoint_auth_method: z.literal("none").default("none"),
  grant_types: z.array(z.enum(["authorization_code", "refresh_token"])).min(1).max(2).default(["authorization_code", "refresh_token"]),
  response_types: z.array(z.literal("code")).length(1).default(["code"]),
  client_uri: z.url().max(2048).optional(), logo_uri: z.url().max(2048).optional(),
  policy_uri: z.url().max(2048).optional(), tos_uri: z.url().max(2048).optional(),
  contacts: z.array(z.email().max(255)).max(5).optional(),
  scope: z.string().max(256).optional(), software_id: z.string().max(100).optional(), software_version: z.string().max(100).optional(),
}).strict();
export async function registerClient(value: unknown) {
  const data = registrationSchema.parse(value);
  if (!data.redirect_uris.every(allowedRedirect)) throw new McpError("invalid_redirect_uri", 400);
  const client = await prisma.mcpOAuthClient.create({ data: { name: data.client_name, redirectUris: [...new Set(data.redirect_uris)] } });
  return { client_id: client.id, client_name: client.name, client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000), redirect_uris: client.redirectUris,
    token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] };
}
