import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/backend/db/prisma";
import {
  AUTH_COOKIE_NAME,
  SessionUser,
  verifySessionToken,
} from "@/backend/auth/session";

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionUser = verifySessionToken(token);
  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) return null;

  return user;
}

export async function getApiSessionUser(
  request: NextRequest
): Promise<SessionUser | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionUser = verifySessionToken(token);
  if (!sessionUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) return null;

  return user;
}
