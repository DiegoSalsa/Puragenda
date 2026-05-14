import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import crypto from "crypto";

/**
 * GET /api/mercadopago/authorize
 *
 * Generates the Mercado Pago OAuth authorization URL and redirects the
 * business owner so they can connect their MP account to Puragenda.
 *
 * The `state` parameter embeds the businessId + a random nonce for CSRF
 * protection. Both are verified in the callback route.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authenticated user
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión primero." },
        { status: 401 }
      );
    }

    // 2. Get the business for this user
    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json(
        { error: "No se encontró un negocio asociado a tu cuenta." },
        { status: 404 }
      );
    }

    // 3. Validate env vars
    const clientId = process.env.MP_APP_ID;
    const redirectUri = process.env.MP_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("[mp/authorize] Missing MP_APP_ID or MP_REDIRECT_URI");
      return NextResponse.json(
        { error: "Configuración de Mercado Pago incompleta en el servidor." },
        { status: 500 }
      );
    }

    // 4. Build the state param: businessId + random nonce for CSRF protection
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = `${business.id}:${nonce}`;

    // 5. Build Mercado Pago authorization URL
    const authUrl = new URL("https://auth.mercadopago.com/authorization");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("redirect_uri", redirectUri);

    // 6. Redirect user to Mercado Pago
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[mp/authorize] Error:", error);
    return NextResponse.json(
      { error: "Error al generar la URL de autorización." },
      { status: 500 }
    );
  }
}
