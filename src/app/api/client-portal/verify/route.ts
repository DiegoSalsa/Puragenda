import { NextRequest, NextResponse } from "next/server";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  consumeClientPortalAccessSession,
  getClientPortalCookieOptions,
  getClientPortalAppUrl,
} from "@/server/services/client-portal.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const session = await consumeClientPortalAccessSession(token);
  const destination = new URL("/mi-agenda", getClientPortalAppUrl(request.nextUrl.origin));

  if (!session) {
    destination.searchParams.set("error", "enlace-invalido");
    return NextResponse.redirect(destination, { status: 303 });
  }

  const response = NextResponse.redirect(destination, { status: 303 });
  response.cookies.set(
    CLIENT_PORTAL_COOKIE_NAME,
    session,
    getClientPortalCookieOptions(),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
