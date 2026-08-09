import crypto from "crypto";
import { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/core/constants";
import type { SessionUser } from "@/core/entities";

export { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
export type { SessionUser };

interface SessionPayload extends SessionUser {
  exp: number;
  v: 3;
}

function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (configured && configured.length >= 32) {
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL: AUTH_SECRET environment variable must be set in production (minimum 32 characters). " +
      "Generate one with: openssl rand -base64 32"
    );
  }
  return "dev-only-auth-secret-do-not-use-in-production!!";
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function sign(encodedPayload: string): string {
  return toBase64Url(
    crypto.createHmac("sha256", getAuthSecret()).update(encodedPayload).digest()
  );
}

export function createSessionToken(
  user: SessionUser,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS
): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    v: 3,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const decoded = fromBase64Url(encodedPayload).toString("utf8");
    const payload = JSON.parse(decoded) as SessionPayload;

    if (payload.v !== 3) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!Number.isSafeInteger(payload.tokenVersion) || payload.tokenVersion < 1) return null;

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      isSuperAdmin: payload.isSuperAdmin ?? false,
      tokenVersion: payload.tokenVersion,
      adminAccess: payload.adminAccess ?? false,
    };
  } catch {
    return null;
  }
}

/**
 * Cookie options for session management.
 * Note: 'domain' is intentionally omitted. The browser defaults to the exact
 * host (www.puragenda.cl), which is more secure than setting domain explicitly.
 * Only add 'domain' if subdomain cookie sharing is needed in the future.
 */
export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
