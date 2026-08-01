import { NextResponse } from "next/server";
import {
  CLIENT_PORTAL_COOKIE_NAME,
  getClientPortalCookieOptions,
} from "@/server/services/client-portal.service";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_PORTAL_COOKIE_NAME, "", getClientPortalCookieOptions(0));
  return response;
}
