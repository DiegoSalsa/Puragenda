import { prisma } from "@/server/db/prisma";
import { createSessionToken, getSessionCookieOptions } from "@/server/auth/session";

export const DEMO_EMAIL = "vale@esteticabella.cl";
// The public demo is intentionally long-lived so returning visitors do not
// get sent through the regular password login flow. Token version changes
// still invalidate it immediately if the fixture account is rotated.
export const DEMO_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isDemoAccountEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === DEMO_EMAIL;
}

export function getDemoSessionCookieOptions() {
  return getSessionCookieOptions(DEMO_SESSION_MAX_AGE_SECONDS);
}

export async function issueDemoSessionToken() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuperAdmin: true,
      tokenVersion: true,
    },
  });

  if (!user) return null;

  return createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    tokenVersion: user.tokenVersion,
  }, DEMO_SESSION_MAX_AGE_SECONDS);
}
