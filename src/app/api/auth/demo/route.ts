import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { AUTH_COOKIE_NAME, createSessionToken, getSessionCookieOptions } from "@/server/auth/session";

export async function GET(request: Request) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "vale@esteticabella.cl" },
      select: { id: true, email: true, name: true, role: true, isSuperAdmin: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Cuenta demo no encontrada" }, { status: 404 });
    }

    const token = createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    });

    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
    const origin = host ? `${protocol}://${host}` : requestUrl.origin;
    const redirectUrl = new URL("/dashboard", origin);
    const response = NextResponse.redirect(redirectUrl);
    
    response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

    return response;
  } catch (error) {
    console.error("[route] Error in demo login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
