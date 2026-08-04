import crypto from "crypto";
import { isMercadoPagoCountryCode, isSupportedCountryCode } from "@/core/countries";
import { prisma } from "@/server/db/prisma";

interface MercadoPagoOAuthState {
  businessId: string;
  countryCode: string;
  exp: number;
  nonce: string;
}

export interface MercadoPagoOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function stateSecret() {
  const secret = process.env.MP_OAUTH_STATE_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("MP_OAUTH_STATE_SECRET or AUTH_SECRET must contain at least 32 characters");
  }
  return "dev-only-mp-oauth-state-secret-not-for-production";
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string) {
  return base64Url(crypto.createHmac("sha256", stateSecret()).update(payload).digest());
}

export function getMercadoPagoOAuthConfig(countryCode: string): MercadoPagoOAuthConfig | null {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  if (!isMercadoPagoCountryCode(normalizedCountryCode)) return null;

  // Reuse the marketplace application by default. Country-specific credentials
  // remain available as overrides if Mercado Pago requires a separate application
  // for a particular site/account.
  const clientId = process.env[`MP_APP_ID_${normalizedCountryCode}`]
    ?? process.env.MP_APP_ID;
  const clientSecret = process.env[`MP_CLIENT_SECRET_${normalizedCountryCode}`]
    ?? process.env.MP_CLIENT_SECRET;
  const redirectUri = process.env[`MP_REDIRECT_URI_${normalizedCountryCode}`] ?? process.env.MP_REDIRECT_URI;
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

export function createMercadoPagoOAuthState(businessId: string, countryCode: string) {
  const state: MercadoPagoOAuthState = {
    businessId,
    countryCode,
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const payload = base64Url(JSON.stringify(state));
  return `${payload}.${sign(payload)}`;
}

export function verifyMercadoPagoOAuthState(token: string): MercadoPagoOAuthState | null {
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length > 0) return null;
  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<MercadoPagoOAuthState>;
    if (
      typeof state.businessId !== "string" ||
      typeof state.countryCode !== "string" ||
      !isSupportedCountryCode(state.countryCode) ||
      typeof state.exp !== "number" ||
      state.exp <= Math.floor(Date.now() / 1000) ||
      typeof state.nonce !== "string"
    ) {
      return null;
    }
    return state as MercadoPagoOAuthState;
  } catch {
    return null;
  }
}

export async function getValidMercadoPagoAccessToken(businessId: string): Promise<string | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      countryCode: true,
      mpAccessToken: true,
      mpRefreshToken: true,
      mpTokenExpiresAt: true,
    },
  });
  if (!business?.mpAccessToken) return null;
  if (!business.mpTokenExpiresAt || business.mpTokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return business.mpAccessToken;
  }
  if (!business.mpRefreshToken || !isSupportedCountryCode(business.countryCode)) return null;

  const config = getMercadoPagoOAuthConfig(business.countryCode);
  if (!config) return null;
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: business.mpRefreshToken,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("[mp/oauth] Token refresh failed", response.status);
    return null;
  }
  const refreshed = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!refreshed.access_token) return null;
  await prisma.business.update({
    where: { id: businessId },
    data: {
      mpAccessToken: refreshed.access_token,
      mpRefreshToken: refreshed.refresh_token || business.mpRefreshToken,
      mpTokenExpiresAt: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : null,
    },
  });
  return refreshed.access_token;
}
