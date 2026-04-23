import {
  AUTH_COOKIE_NAME,
  getSessionCookieOptions,
} from "@/backend/auth/session";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Sesion cerrada" }, { status: 200 });

  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
