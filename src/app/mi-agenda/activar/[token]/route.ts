import { NextRequest, NextResponse } from "next/server";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  createClientPortalSessionToken,
  getClientPortalAppUrl,
  getClientPortalCookieOptions,
  verifyClientPortalAccount,
} from "@/server/services/client-portal.service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const email = await verifyClientPortalAccount(token);
  const destination = new URL("/mi-agenda", getClientPortalAppUrl(request.nextUrl.origin));
  if (!email) {
    destination.searchParams.set("error", "activacion-invalida");
    return NextResponse.redirect(destination, { status: 303 });
  }
  destination.searchParams.set("cuenta", "activada");
  const response = NextResponse.redirect(destination, { status: 303 });
  response.cookies.set(CLIENT_PORTAL_COOKIE_NAME, createClientPortalSessionToken(email), getClientPortalCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
