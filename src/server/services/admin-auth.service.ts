import crypto from "crypto";
import { prisma } from "@/server/db/prisma";
import { sendAdminLoginCodeEmail } from "@/server/email/send";
import {
  ADMIN_LOGIN_CODE_MAX_ATTEMPTS,
  ADMIN_LOGIN_CODE_RESEND_SECONDS,
  ADMIN_LOGIN_CODE_TTL_MINUTES,
} from "@/core/constants";

const INVALID_CODE_ERROR = "Código inválido o vencido";

function getCodeSecret(): string {
  const secret = process.env.ADMIN_OTP_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_OTP_SECRET or AUTH_SECRET must be configured in production");
  }

  return "dev-only-admin-code-secret-do-not-use-in-production";
}

function hashCode(userId: string, code: string): string {
  return crypto
    .createHmac("sha256", getCodeSecret())
    .update(`${userId}:${code}`)
    .digest("hex");
}

function codeMatches(expectedHash: string, actualHash: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function createSixDigitCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function requestAdminLoginCode(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isSuperAdmin: true, deletedAt: true },
  });

  // Always return the same public response so the endpoint cannot enumerate admins.
  if (!user || !user.isSuperAdmin || user.deletedAt) return;

  const resendThreshold = new Date(Date.now() - ADMIN_LOGIN_CODE_RESEND_SECONDS * 1000);
  const recentCode = await prisma.adminLoginCode.findFirst({
    where: { userId: user.id, createdAt: { gt: resendThreshold } },
    select: { id: true },
  });
  if (recentCode) return;

  const now = new Date();
  const code = createSixDigitCode();
  const challenge = await prisma.$transaction(async (tx) => {
    await tx.adminLoginCode.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now },
    });
    await tx.adminLoginCode.deleteMany({
      where: { userId: user.id, createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
    return tx.adminLoginCode.create({
      data: {
        userId: user.id,
        codeHash: hashCode(user.id, code),
        expiresAt: new Date(now.getTime() + ADMIN_LOGIN_CODE_TTL_MINUTES * 60 * 1000),
      },
      select: { id: true },
    });
  });

  try {
    await sendAdminLoginCodeEmail(user.email, user.name, code, ADMIN_LOGIN_CODE_TTL_MINUTES);
  } catch (error) {
    await prisma.adminLoginCode.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    console.error("[AdminAuth] Failed to deliver login code:", error);
  }
}

export async function verifyAdminLoginCode(email: string, code: string, ipAddress: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuperAdmin: true,
      deletedAt: true,
    },
  });

  if (!user || !user.isSuperAdmin || user.deletedAt) {
    return { error: INVALID_CODE_ERROR } as const;
  }

  const challenge = await prisma.adminLoginCode.findFirst({
    where: { userId: user.id, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();

  if (!challenge || challenge.expiresAt <= now || challenge.attempts >= ADMIN_LOGIN_CODE_MAX_ATTEMPTS) {
    if (challenge) {
      await prisma.adminLoginCode.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: now },
      });
    }
    return { error: INVALID_CODE_ERROR } as const;
  }

  const actualHash = hashCode(user.id, code);
  if (!codeMatches(challenge.codeHash, actualHash)) {
    const nextAttempts = challenge.attempts + 1;
    await prisma.adminLoginCode.updateMany({
      where: { id: challenge.id, consumedAt: null, attempts: challenge.attempts },
      data: {
        attempts: { increment: 1 },
        consumedAt: nextAttempts >= ADMIN_LOGIN_CODE_MAX_ATTEMPTS ? now : undefined,
      },
    });
    return { error: INVALID_CODE_ERROR } as const;
  }

  const consumed = await prisma.adminLoginCode.updateMany({
    where: {
      id: challenge.id,
      consumedAt: null,
      attempts: { lt: ADMIN_LOGIN_CODE_MAX_ATTEMPTS },
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) return { error: INVALID_CODE_ERROR } as const;

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "SUPERADMIN_CODE_LOGIN",
      ipAddress,
      details: JSON.stringify({ method: "email_code" }),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    },
  } as const;
}
