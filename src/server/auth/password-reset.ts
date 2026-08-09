import crypto from "node:crypto";
import { prisma } from "@/server/db/prisma";

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordResetToken(email: string, lifetimeMs = 60 * 60 * 1000) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + lifetimeMs);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { email } }),
    prisma.passwordResetToken.create({
      data: { email, token: hashPasswordResetToken(token), expires },
    }),
  ]);

  return token;
}

export async function findPasswordResetToken(token: string) {
  if (!token || token.length > 256) return null;
  const tokenHash = hashPasswordResetToken(token);

  // The raw-token fallback keeps already-issued links working during rollout.
  return prisma.passwordResetToken.findFirst({
    where: { token: { in: [tokenHash, token] } },
  });
}
