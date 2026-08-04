import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getCountryConfig, isMercadoPagoCurrencyCompatible } from "@/core/countries";
import {
  getMercadoPagoOAuthConfig,
  verifyMercadoPagoOAuthState,
} from "@/server/services/mercadopago-oauth.service";

function settingsRedirect(code: string, key = "mp_error") {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL("/dashboard/settings", baseUrl);
  url.searchParams.set(key, code);
  return NextResponse.redirect(url.toString());
}

/** Completes OAuth and only stores a seller account that matches the business country. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("error")) return settingsRedirect("denied");

  const code = searchParams.get("code");
  const stateToken = searchParams.get("state");
  if (!code || !stateToken) return settingsRedirect("invalid_params");

  const state = verifyMercadoPagoOAuthState(stateToken);
  if (!state) return settingsRedirect("invalid_state");
  const config = getMercadoPagoOAuthConfig(state.countryCode);
  if (!config) return settingsRedirect("server_config");

  try {
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) {
      console.error("[mp/callback] Token exchange failed", tokenResponse.status);
      return settingsRedirect("token_exchange");
    }

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      user_id?: number | string;
      expires_in?: number;
    };
    if (!tokenData.access_token) return settingsRedirect("no_token");

    const [business, profileResponse] = await Promise.all([
      prisma.business.findUnique({ where: { id: state.businessId }, select: { countryCode: true, currencyCode: true } }),
      fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
        cache: "no-store",
      }),
    ]);
    if (!business || business.countryCode !== state.countryCode) {
      return settingsRedirect("country_changed");
    }
    if (!isMercadoPagoCurrencyCompatible(business.countryCode, business.currencyCode)) {
      return settingsRedirect("currency_mismatch");
    }
    if (!profileResponse.ok) {
      console.error("[mp/callback] Account verification failed", profileResponse.status);
      return settingsRedirect("account_verification");
    }

    const profile = await profileResponse.json() as { site_id?: string };
    const expectedSiteId = getCountryConfig(state.countryCode).mercadoPagoSiteId;
    if (profile.site_id !== expectedSiteId) {
      console.error(`[mp/callback] Site mismatch: expected ${expectedSiteId}, received ${profile.site_id ?? "unknown"}`);
      return settingsRedirect("country_mismatch");
    }

    await prisma.business.update({
      where: { id: state.businessId },
      data: {
        mpAccessToken: tokenData.access_token,
        mpRefreshToken: tokenData.refresh_token || null,
        mpUserId: tokenData.user_id?.toString() || null,
        mpTokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : null,
      },
    });
    return settingsRedirect("true", "mp_connected");
  } catch (error) {
    console.error("[mp/callback] Unexpected error:", error);
    return settingsRedirect("unexpected");
  }
}
