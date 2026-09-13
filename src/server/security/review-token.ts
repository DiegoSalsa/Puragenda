import crypto from "node:crypto";
import { REVIEW_TOKEN_PURPOSE, REVIEW_TOKEN_TTL_MS } from "@/lib/reviews/constants";

export type ReviewTokenPayload = {
  purpose: typeof REVIEW_TOKEN_PURPOSE;
  appointmentId: string;
  businessId: string;
  exp: number;
};

function tokenSecret() {
  const secret = process.env.BOOKING_REVIEW_TOKEN_SECRET
    ?? process.env.AUTH_SECRET
    ?? process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BOOKING_REVIEW_TOKEN_SECRET or AUTH_SECRET must be configured in production");
  }
  return "dev-only-verified-review-token-secret!!";
}

function sign(value: string) {
  return crypto.createHmac("sha256", tokenSecret()).update(value).digest("base64url");
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signReviewToken(input: {
  appointmentId: string;
  businessId: string;
  now?: number;
  ttlMs?: number;
}) {
  const payload: ReviewTokenPayload = {
    purpose: REVIEW_TOKEN_PURPOSE,
    appointmentId: input.appointmentId,
    businessId: input.businessId,
    exp: (input.now ?? Date.now()) + (input.ttlMs ?? REVIEW_TOKEN_TTL_MS),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyReviewToken(token: string, now = Date.now()): ReviewTokenPayload | null {
  if (typeof token !== "string") return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (!timingSafeEqual(sign(encoded), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ReviewTokenPayload;
    if (
      payload.purpose !== REVIEW_TOKEN_PURPOSE
      || typeof payload.appointmentId !== "string"
      || typeof payload.businessId !== "string"
      || typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (!payload.appointmentId || !payload.businessId || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
