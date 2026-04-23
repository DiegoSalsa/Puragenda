import crypto from "crypto";

export const AUTH_COOKIE_NAME = "agenda_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionRole = "OWNER" | "ADMIN";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
}

interface SessionPayload extends SessionUser {
  exp: number;
  v: 1;
}

function getAuthSecret() {
  const configured = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (configured && configured.length >= 32) {
    return configured;
  }

  // Dev fallback so local env works even before AUTH_SECRET is configured.
  return "dev-only-auth-secret-change-in-production-32+chars";
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function sign(encodedPayload: string) {
  return toBase64Url(
    crypto
      .createHmac("sha256", getAuthSecret())
      .update(encodedPayload)
      .digest()
  );
}

export function createSessionToken(
  user: SessionUser,
  maxAgeSeconds = SESSION_MAX_AGE_SECONDS
) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    v: 1,
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

    if (payload.v !== 1) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
