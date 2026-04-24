import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/server/auth/session";
import type { SessionUser } from "@/core/entities";

/**
 * Get current user from server component context (uses cookies()).
 */
export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionUser = verifySessionToken(token);
  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, role: true, isSuperAdmin: true },
  });

  if (!user) return null;
  return user;
}

/**
 * Get current user from API route context (uses request cookies).
 */
export async function getApiSessionUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionUser = verifySessionToken(token);
  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, role: true, isSuperAdmin: true },
  });

  if (!user) return null;
  return user;
}
