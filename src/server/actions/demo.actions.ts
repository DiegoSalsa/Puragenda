"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getSessionCookieOptions } from "@/server/auth/session";
import { issueDemoSessionToken } from "@/server/auth/demo-session";

export async function startDemoAction() {
  const token = await issueDemoSessionToken();
  if (!token) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
  redirect("/dashboard");
}
