import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  ADMIN_AUTH_COOKIE_NAME,
  ADMIN_REMEMBERED_SESSION_MAX_AGE_SECONDS,
  ADMIN_SESSION_LAST_USED_THROTTLE_SECONDS,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ADMIN_STEP_UP_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  STEP_UP_REQUIRED,
} from "@/core/constants";
import type { SessionUser } from "@/core/entities";
import { prisma } from "@/server/db/prisma";
import { verifySessionToken } from "@/server/auth/session";

export { ADMIN_AUTH_COOKIE_NAME, STEP_UP_REQUIRED };

const ADMIN_SESSION_TOKEN_PREFIX = "sas_";
const ADMIN_SESSION_TOKEN_PATTERN = /^sas_[A-Za-z0-9_-]{43}$/;
const LEGACY_ADMIN_SESSION_ID = "legacy";

export type AdminSessionUser = SessionUser & {
  adminAccess: true;
  sessionId: string;
  lastAuthAt: Date;
  expiresAt: Date | null;
  rememberDevice: boolean;
};

export type SuperAdminSessionRecord = {
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  rememberDevice: boolean;
  current: boolean;
};

type SuperAdminUser = {
  id: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  isSuperAdmin: boolean;
  tokenVersion: number;
};

export function getAdminSessionMaxAgeSeconds(rememberDevice: boolean): number {
  return rememberDevice ? ADMIN_REMEMBERED_SESSION_MAX_AGE_SECONDS : ADMIN_SESSION_MAX_AGE_SECONDS;
}

export function getAdminSessionCookieOptions(maxAge = ADMIN_REMEMBERED_SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function clearAdminSessionCookieOptions() {
  return {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  };
}

export function hashAdminSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isAdminSessionToken(token: string | undefined | null): token is string {
  return typeof token === "string" && ADMIN_SESSION_TOKEN_PATTERN.test(token);
}

export function summarizeUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent.slice(0, 256);
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Navegador";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS") || ua.includes("Macintosh")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : ua.includes("iPhone") || ua.includes("iPad")
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : "otro";
  return `${browser} · ${os}`;
}

function createOpaqueAdminSessionToken(): string {
  return `${ADMIN_SESSION_TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
}

function toAdminSessionUser(
  user: SuperAdminUser,
  extras: { sessionId: string; lastAuthAt: Date; expiresAt: Date | null; rememberDevice: boolean },
): AdminSessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    tokenVersion: user.tokenVersion,
    adminAccess: true,
    sessionId: extras.sessionId,
    lastAuthAt: extras.lastAuthAt,
    expiresAt: extras.expiresAt,
    rememberDevice: extras.rememberDevice,
  };
}

export async function createSuperAdminSession(input: {
  user: SuperAdminUser;
  rememberDevice?: boolean;
  userAgent?: string | null;
  now?: Date;
}): Promise<{ token: string; sessionId: string; maxAgeSeconds: number; expiresAt: Date }> {
  if (!input.user.isSuperAdmin) {
    throw new Error("Solo un superadmin puede crear una sesión persistente de panel");
  }

  const now = input.now ?? new Date();
  const rememberDevice = input.rememberDevice !== false;
  const maxAgeSeconds = getAdminSessionMaxAgeSeconds(rememberDevice);
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000);
  const token = createOpaqueAdminSessionToken();
  const tokenHash = hashAdminSessionToken(token);

  const session = await prisma.$transaction(async (tx) => {
    await tx.superAdminSession.deleteMany({
      where: {
        userId: input.user.id,
        OR: [
          { expiresAt: { lte: now } },
          { revokedAt: { lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    return tx.superAdminSession.create({
      data: {
        userId: input.user.id,
        tokenHash,
        createdAt: now,
        expiresAt,
        lastUsedAt: now,
        lastAuthAt: now,
        userAgent: summarizeUserAgent(input.userAgent),
        rememberDevice,
      },
      select: { id: true },
    });
  });

  return { token, sessionId: session.id, maxAgeSeconds, expiresAt };
}

export async function resolveSuperAdminSessionToken(
  token: string | undefined | null,
  now = new Date(),
): Promise<AdminSessionUser | null> {
  if (!isAdminSessionToken(token)) return null;

  const session = await prisma.superAdminSession.findUnique({
    where: { tokenHash: hashAdminSessionToken(token) },
    select: {
      id: true,
      expiresAt: true,
      lastUsedAt: true,
      lastAuthAt: true,
      revokedAt: true,
      rememberDevice: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isSuperAdmin: true,
          tokenVersion: true,
          deletedAt: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= now ||
    !session.user.isSuperAdmin ||
    session.user.deletedAt
  ) {
    return null;
  }

  if (now.getTime() - session.lastUsedAt.getTime() >= ADMIN_SESSION_LAST_USED_THROTTLE_SECONDS * 1000) {
    await prisma.superAdminSession.updateMany({
      where: { id: session.id, revokedAt: null, expiresAt: { gt: now } },
      data: { lastUsedAt: now },
    });
  }

  return toAdminSessionUser(session.user, {
    sessionId: session.id,
    lastAuthAt: session.lastAuthAt,
    expiresAt: session.expiresAt,
    rememberDevice: session.rememberDevice,
  });
}

async function resolveLegacyAdminSession(token: string | undefined | null): Promise<AdminSessionUser | null> {
  if (!token || isAdminSessionToken(token)) return null;
  const sessionUser = verifySessionToken(token);
  if (!sessionUser?.isSuperAdmin || !sessionUser.adminAccess) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isSuperAdmin: true,
      tokenVersion: true,
      deletedAt: true,
    },
  });

  if (
    !user ||
    user.deletedAt ||
    !user.isSuperAdmin ||
    user.tokenVersion !== sessionUser.tokenVersion
  ) {
    return null;
  }

  return toAdminSessionUser(user, {
    sessionId: LEGACY_ADMIN_SESSION_ID,
    lastAuthAt: new Date(0),
    expiresAt: null,
    rememberDevice: false,
  });
}

export async function getCurrentAdminSessionUser(): Promise<AdminSessionUser | null> {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  const resolved = await resolveSuperAdminSessionToken(adminToken);
  if (resolved) return resolved;
  return resolveLegacyAdminSession(cookieStore.get(AUTH_COOKIE_NAME)?.value);
}

export async function getApiAdminSessionUser(request: NextRequest): Promise<AdminSessionUser | null> {
  const adminToken = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value;
  const resolved = await resolveSuperAdminSessionToken(adminToken);
  if (resolved) return resolved;
  return resolveLegacyAdminSession(request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export async function requireSuperAdminSession(): Promise<AdminSessionUser> {
  const user = await getCurrentAdminSessionUser();
  if (!user) throw new Error("Acceso denegado");
  return user;
}

export function isRecentAdminAuth(
  user: Pick<AdminSessionUser, "lastAuthAt">,
  maxAgeSeconds = ADMIN_STEP_UP_MAX_AGE_SECONDS,
  now = new Date(),
): boolean {
  return now.getTime() - user.lastAuthAt.getTime() <= maxAgeSeconds * 1000;
}

export function stepUpRequiredResult() {
  return {
    error: STEP_UP_REQUIRED,
    message: "Confirma tu identidad para esta acción. Solicita un código de verificación.",
  } as const;
}

export async function markSuperAdminSessionReauthenticated(sessionId: string, now = new Date()): Promise<boolean> {
  if (!sessionId || sessionId === LEGACY_ADMIN_SESSION_ID) return false;
  const result = await prisma.superAdminSession.updateMany({
    where: { id: sessionId, revokedAt: null, expiresAt: { gt: now } },
    data: { lastAuthAt: now, lastUsedAt: now },
  });
  return result.count === 1;
}

export async function revokeSuperAdminSessionByToken(token: string | undefined | null, now = new Date()): Promise<boolean> {
  if (!isAdminSessionToken(token)) return false;
  const result = await prisma.superAdminSession.updateMany({
    where: { tokenHash: hashAdminSessionToken(token), revokedAt: null },
    data: { revokedAt: now },
  });
  return result.count === 1;
}

export async function revokeSuperAdminSessionById(
  userId: string,
  sessionId: string,
  now = new Date(),
): Promise<boolean> {
  if (!sessionId || sessionId === LEGACY_ADMIN_SESSION_ID) return false;
  const result = await prisma.superAdminSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: now },
  });
  return result.count === 1;
}

export async function revokeAllSuperAdminSessionsForUser(userId: string, now = new Date()): Promise<number> {
  const result = await prisma.superAdminSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
  return result.count;
}

export async function revokeAllSuperAdminSessionsForEmail(email: string, now = new Date()): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) return 0;
  return revokeAllSuperAdminSessionsForUser(user.id, now);
}

export async function listSuperAdminSessions(userId: string, currentSessionId?: string, now = new Date()): Promise<SuperAdminSessionRecord[]> {
  const sessions = await prisma.superAdminSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      userAgent: true,
      rememberDevice: true,
    },
  });

  return sessions.map((session) => ({
    ...session,
    current: session.id === currentSessionId,
  }));
}
