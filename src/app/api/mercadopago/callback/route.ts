import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

/**
 * GET /api/mercadopago/callback?code=...&state=...
 *
 * Mercado Pago redirects here after the business owner authorizes.
 * We exchange the authorization code for real credentials and store them.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const dashboardSettings = `${baseUrl}/dashboard/settings`;

  // ── Handle user denial or error from MP ──
  if (error) {
    console.warn("[mp/callback] User denied access or error:", error);
    const errorUrl = new URL(dashboardSettings);
    errorUrl.searchParams.set("mp_error", "denied");
    return NextResponse.redirect(errorUrl.toString());
  }

  // ── Validate required params ──
  if (!code || !state) {
    console.error("[mp/callback] Missing code or state parameter");
    const errorUrl = new URL(dashboardSettings);
    errorUrl.searchParams.set("mp_error", "invalid_params");
    return NextResponse.redirect(errorUrl.toString());
  }

  // ── Extract businessId from state ──
  const [businessId] = state.split(":");
  if (!businessId) {
    console.error("[mp/callback] Invalid state format:", state);
    const errorUrl = new URL(dashboardSettings);
    errorUrl.searchParams.set("mp_error", "invalid_state");
    return NextResponse.redirect(errorUrl.toString());
  }

  // ── Validate env vars ──
  const clientId = process.env.MP_APP_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const redirectUri = process.env.MP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("[mp/callback] Missing MP env vars");
    const errorUrl = new URL(dashboardSettings);
    errorUrl.searchParams.set("mp_error", "server_config");
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // ── Exchange authorization code for tokens ──
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(
        "[mp/callback] Token exchange failed:",
        tokenResponse.status,
        errorBody
      );
      const errorUrl = new URL(dashboardSettings);
      errorUrl.searchParams.set("mp_error", "token_exchange");
      return NextResponse.redirect(errorUrl.toString());
    }

    const tokenData = await tokenResponse.json();

    const {
      access_token,
      refresh_token,
      user_id,
      expires_in, // seconds
    } = tokenData;

    if (!access_token) {
      console.error("[mp/callback] No access_token in response:", tokenData);
      const errorUrl = new URL(dashboardSettings);
      errorUrl.searchParams.set("mp_error", "no_token");
      return NextResponse.redirect(errorUrl.toString());
    }

    // ── Calculate token expiration date ──
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // ── Save credentials to Business ──
    await prisma.business.update({
      where: { id: businessId },
      data: {
        mpAccessToken: access_token,
        mpRefreshToken: refresh_token || null,
        mpUserId: user_id?.toString() || null,
        mpTokenExpiresAt: expiresAt,
      },
    });

    console.log(
      `[mp/callback] ✅ Business ${businessId} connected MP user ${user_id}`
    );

    // ── Redirect to dashboard with success ──
    const successUrl = new URL(dashboardSettings);
    successUrl.searchParams.set("mp_connected", "true");
    return NextResponse.redirect(successUrl.toString());
  } catch (err) {
    console.error("[mp/callback] Unexpected error:", err);
    const errorUrl = new URL(dashboardSettings);
    errorUrl.searchParams.set("mp_error", "unexpected");
    return NextResponse.redirect(errorUrl.toString());
  }
}
