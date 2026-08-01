import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";

export const CLIENT_PORTAL_COOKIE_NAME = "puragenda_client_portal";
export const CLIENT_PORTAL_SESSION_SECONDS = 30 * 24 * 60 * 60;
export const CLIENT_PORTAL_LINK_MINUTES = 15;
export const CLIENT_PORTAL_EMAIL_LINK_DAYS = 30;

const MAGIC_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

interface ClientPortalPayload {
  email: string;
  exp: number;
  v: 1;
  purpose: "client-portal";
}

function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: AUTH_SECRET must be configured for the client portal");
  }
  return "dev-only-auth-secret-do-not-use-in-production!!";
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return toBase64Url(crypto.createHmac("sha256", getAuthSecret()).update(value).digest());
}

export function normalizeClientPortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getClientPortalAppUrl(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    if (configured && !/^http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/i.test(configured)) {
      return configured;
    }
    return "https://www.puragenda.cl";
  }
  if (configured) return configured;
  return fallbackOrigin?.replace(/\/+$/, "") || "http://localhost:3000";
}

export function hashClientPortalToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createClientPortalMagicToken(email: string, lifetimeMinutes: number) {
  const normalizedEmail = normalizeClientPortalEmail(email);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + lifetimeMinutes * 60 * 1000);

  await prisma.$transaction([
    prisma.clientPortalToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    }),
    prisma.clientPortalToken.create({
      data: { email: normalizedEmail, tokenHash: hashClientPortalToken(token), expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

export async function issueClientPortalMagicToken(email: string) {
  return createClientPortalMagicToken(email, CLIENT_PORTAL_LINK_MINUTES);
}

export async function issueClientPortalEmailToken(email: string) {
  return createClientPortalMagicToken(email, CLIENT_PORTAL_EMAIL_LINK_DAYS * 24 * 60);
}

export async function issueClientPortalEmailTokens(emails: string[]): Promise<Map<string, string>> {
  const normalizedEmails = [...new Set(emails.map(normalizeClientPortalEmail).filter(Boolean))];
  const expiresAt = new Date(Date.now() + CLIENT_PORTAL_EMAIL_LINK_DAYS * 24 * 60 * 60 * 1000);
  const tokens = normalizedEmails.map((email) => {
    const token = crypto.randomBytes(32).toString("hex");
    return { email, token, tokenHash: hashClientPortalToken(token) };
  });

  await prisma.$transaction([
    prisma.clientPortalToken.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
    prisma.clientPortalToken.createMany({
      data: tokens.map(({ email, tokenHash }) => ({ email, tokenHash, expiresAt })),
    }),
  ]);

  return new Map(tokens.map(({ email, token }) => [email, token]));
}

export async function consumeClientPortalMagicToken(token: string): Promise<string | null> {
  if (!MAGIC_TOKEN_PATTERN.test(token)) return null;
  const tokenHash = hashClientPortalToken(token);
  const record = await prisma.clientPortalToken.findUnique({ where: { tokenHash } });
  if (!record || record.consumedAt || record.expiresAt <= new Date()) return null;

  const result = await prisma.clientPortalToken.updateMany({
    where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });

  return result.count === 1 ? record.email : null;
}

export function createClientPortalSessionToken(
  email: string,
  maxAgeSeconds = CLIENT_PORTAL_SESSION_SECONDS,
): string {
  const payload: ClientPortalPayload = {
    email: normalizeClientPortalEmail(email),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    v: 1,
    purpose: "client-portal",
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyClientPortalSessionToken(token: string): string | null {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = sign(encoded);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as ClientPortalPayload;
    if (
      payload.v !== 1 ||
      payload.purpose !== "client-portal" ||
      typeof payload.email !== "string" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return normalizeClientPortalEmail(payload.email);
  } catch {
    return null;
  }
}

export function getClientPortalCookieOptions(maxAge = CLIENT_PORTAL_SESSION_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function getClientPortalEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  return token ? verifyClientPortalSessionToken(token) : null;
}

export function getClientPortalEmailFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  return token ? verifyClientPortalSessionToken(token) : null;
}

function portalEmailWhere(email: string) {
  return {
    OR: [
      { customerEmail: { equals: email, mode: "insensitive" as const } },
      { client: { is: { email: { equals: email, mode: "insensitive" as const } } } },
    ],
  };
}

export async function hasClientPortalRecords(email: string): Promise<boolean> {
  const normalizedEmail = normalizeClientPortalEmail(email);
  const [client, appointment] = await Promise.all([
    prisma.client.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true },
    }),
    prisma.appointment.findFirst({
      where: portalEmailWhere(normalizedEmail),
      select: { id: true },
    }),
  ]);

  return Boolean(client || appointment);
}

export async function getClientPortalData(email: string) {
  const normalizedEmail = normalizeClientPortalEmail(email);
  const now = new Date();
  const appointmentInclude = {
    service: { select: { name: true } },
    staff: { select: { name: true } },
    business: {
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        address: true,
        mapsUrl: true,
        primaryColor: true,
        timezone: true,
        includeAppointmentActionsInConfirmationEmail: true,
        allowRescheduling: true,
        rescheduleHoursLimit: true,
      },
    },
  } as const;

  const [clients, upcoming, history] = await Promise.all([
    prisma.client.findMany({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            isLoyaltyEnabled: true,
            stampsRequired: true,
            rewardName: true,
          },
        },
        loyaltyCodes: {
          where: { isUsed: false },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            rewardName: true,
            discountType: true,
            discountValue: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        ...portalEmailWhere(normalizedEmail),
        startTime: { gte: now },
        status: { notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"] },
      },
      orderBy: { startTime: "asc" },
      take: 50,
      include: appointmentInclude,
    }),
    prisma.appointment.findMany({
      where: {
        AND: [
          portalEmailWhere(normalizedEmail),
          {
            OR: [
              { startTime: { lt: now } },
              { status: { in: ["CANCELLED", "COMPLETED", "NO_SHOW"] } },
            ],
          },
        ],
      },
      orderBy: { startTime: "desc" },
      take: 50,
      include: appointmentInclude,
    }),
  ]);

  const displayName =
    clients.find((client) => client.name.trim())?.name.trim() ||
    upcoming.find((appointment) => appointment.customerName.trim())?.customerName.trim() ||
    history.find((appointment) => appointment.customerName.trim())?.customerName.trim() ||
    "Cliente";

  return { email: normalizedEmail, displayName, clients, upcoming, history };
}

export async function getClientPortalAppointment(appointmentId: string, email: string) {
  return prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      ...portalEmailWhere(normalizeClientPortalEmail(email)),
    },
    include: {
      service: true,
      staff: true,
      business: {
        include: { owner: { select: { email: true, name: true } } },
      },
    },
  });
}
