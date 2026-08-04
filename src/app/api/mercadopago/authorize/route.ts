import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import {
  getMercadoPagoCurrency,
  isMercadoPagoCountryCode,
  isMercadoPagoCurrencyCompatible,
} from "@/core/countries";
import {
  createMercadoPagoOAuthState,
  getMercadoPagoOAuthConfig,
} from "@/server/services/mercadopago-oauth.service";

/** Starts a country-aware Mercado Pago OAuth flow for the authenticated business. */
export async function GET(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión primero." }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json({ error: "No se encontró un negocio asociado a tu cuenta." }, { status: 404 });
    }
    if (!isMercadoPagoCountryCode(business.countryCode)) {
      return NextResponse.json({ error: "El país del negocio no está soportado por Mercado Pago." }, { status: 400 });
    }
    if (!isMercadoPagoCurrencyCompatible(business.countryCode, business.currencyCode)) {
      const expectedCurrency = getMercadoPagoCurrency(business.countryCode);
      return NextResponse.json(
        { error: `Mercado Pago para ${business.countryCode} requiere que el negocio cobre en ${expectedCurrency}.` },
        { status: 409 },
      );
    }

    const config = getMercadoPagoOAuthConfig(business.countryCode);
    if (!config) {
      console.error(`[mp/authorize] Missing OAuth configuration for ${business.countryCode}`);
      return NextResponse.json(
        { error: `Mercado Pago para ${business.countryCode} todavía no está configurado en el servidor.` },
        { status: 503 },
      );
    }

    const authUrl = new URL("https://auth.mercadopago.com/authorization");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("state", createMercadoPagoOAuthState(business.id, business.countryCode));
    authUrl.searchParams.set("redirect_uri", config.redirectUri);
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[mp/authorize] Error:", error);
    return NextResponse.json({ error: "Error al generar la URL de autorización." }, { status: 500 });
  }
}
