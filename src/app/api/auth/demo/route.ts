import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";
import { issueDemoSessionToken } from "@/server/auth/demo-session";

export async function GET(request: Request) {
  try {
    const token = await issueDemoSessionToken();

    if (!token) {
      return NextResponse.json({ error: "Cuenta demo no encontrada" }, { status: 404 });
    }

    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
    const origin = host ? `${protocol}://${host}` : requestUrl.origin;
    const response = NextResponse.redirect(new URL("/dashboard", origin));
    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error("[route] Error in demo login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
