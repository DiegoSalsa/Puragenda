import { NextRequest, NextResponse } from "next/server";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  getClientPortalCookieOptions,
  revokeClientPortalSessionToken,
} from "@/server/services/client-portal.service";

export async function POST(request: NextRequest) {
  await revokeClientPortalSessionToken(request.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_PORTAL_COOKIE_NAME, "", getClientPortalCookieOptions(0));
  return response;
}
