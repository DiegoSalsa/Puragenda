import { prisma } from "@/server/db/prisma";
import { createSessionToken } from "@/server/auth/session";

const DEMO_EMAIL = "vale@esteticabella.cl";

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
  });
}
