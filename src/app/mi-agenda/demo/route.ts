import { NextRequest, NextResponse } from "next/server";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  createClientPortalAccountSession,
  getClientPortalCookieOptions,
  getClientPortalAppUrl,
  hasClientPortalRecords,
  normalizeClientPortalEmail,
} from "@/server/services/client-portal.service";

/** Local-only shortcut for visual QA. It is unreachable in production. */
export async function GET(request: NextRequest) {
  const configuredEmail = process.env.CLIENT_PORTAL_DEMO_EMAIL;
  const destination = new URL("/mi-agenda", getClientPortalAppUrl(request.nextUrl.origin));
  if (process.env.NODE_ENV === "production" || !configuredEmail) {
    return NextResponse.redirect(destination, { status: 303 });
  }

  const email = normalizeClientPortalEmail(configuredEmail);
  if (!(await hasClientPortalRecords(email))) {
    destination.searchParams.set("error", "demo-sin-reservas");
    return NextResponse.redirect(destination, { status: 303 });
  }

  const response = NextResponse.redirect(destination, { status: 303 });
  response.cookies.set(
    CLIENT_PORTAL_COOKIE_NAME,
    await createClientPortalAccountSession(email),
    getClientPortalCookieOptions(),
  );
  return response;
}
