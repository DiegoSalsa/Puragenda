import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "@/core/constants";
import type { ClientPortalTokenPurpose } from "@prisma/client";

export const CLIENT_PORTAL_COOKIE_NAME = "puragenda_client_portal";
export const CLIENT_PORTAL_SESSION_SECONDS = 400 * 24 * 60 * 60;
export const CLIENT_PORTAL_LEGACY_SESSION_SECONDS = 30 * 24 * 60 * 60;
export const CLIENT_PORTAL_LINK_MINUTES = 15;
export const CLIENT_PORTAL_EMAIL_LINK_DAYS = 30;
export const CLIENT_PORTAL_ACCOUNT_TOKEN_MINUTES = 60;

const MAGIC_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const ACCOUNT_SESSION_PREFIX = "cps_";
const ACCOUNT_SESSION_PATTERN = /^cps_[A-Za-z0-9_-]{43}$/;

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

async function createClientPortalMagicToken(
  email: string,
  lifetimeMinutes: number,
  purpose: ClientPortalTokenPurpose = "MAGIC_ACCESS",
) {
  const normalizedEmail = normalizeClientPortalEmail(email);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + lifetimeMinutes * 60 * 1000);

  await prisma.$transaction([
    prisma.clientPortalToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    }),
    prisma.clientPortalToken.create({
      data: { email: normalizedEmail, tokenHash: hashClientPortalToken(token), expiresAt, purpose },
    }),
  ]);

  return { token, expiresAt };
}

export async function issueClientPortalMagicToken(email: string) {
  return createClientPortalMagicToken(email, CLIENT_PORTAL_LINK_MINUTES, "MAGIC_ACCESS");
}

export async function issueClientPortalVerificationToken(email: string) {
  return createClientPortalMagicToken(email, CLIENT_PORTAL_ACCOUNT_TOKEN_MINUTES, "VERIFY_ACCOUNT");
}

export async function issueClientPortalPasswordResetToken(email: string) {
  return createClientPortalMagicToken(email, CLIENT_PORTAL_ACCOUNT_TOKEN_MINUTES, "RESET_PASSWORD");
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

export async function consumeClientPortalToken(
  token: string,
  purpose?: ClientPortalTokenPurpose,
): Promise<string | null> {
  if (!MAGIC_TOKEN_PATTERN.test(token)) return null;
  const tokenHash = hashClientPortalToken(token);
  const record = await prisma.clientPortalToken.findUnique({ where: { tokenHash } });
  if (!record || record.consumedAt || record.expiresAt <= new Date() || (purpose && record.purpose !== purpose)) return null;

  const result = await prisma.clientPortalToken.updateMany({
    where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });

  return result.count === 1 ? record.email : null;
}

export function consumeClientPortalMagicToken(token: string) {
  return consumeClientPortalToken(token, "MAGIC_ACCESS");
}

export async function registerClientPortalAccount(input: {
  email: string;
  password: string;
  name: string;
  phone: string;
  rut?: string | null;
  defaultAddress?: string | null;
}) {
  const email = normalizeClientPortalEmail(input.email);
  if (!(await hasClientPortalRecords(email))) {
    return { ok: false as const, error: "Primero realiza una reserva con este correo para activar tu cuenta." };
  }

  const existing = await prisma.clientPortalAccount.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt) {
    return { ok: false as const, error: "Esta cuenta ya está activa. Inicia sesión." };
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  await prisma.clientPortalAccount.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      name: input.name.trim(),
      phone: input.phone.trim(),
      rut: input.rut?.trim() || null,
      defaultAddress: input.defaultAddress?.trim() || null,
    },
    update: {
      passwordHash,
      name: input.name.trim(),
      phone: input.phone.trim(),
      rut: input.rut?.trim() || null,
      defaultAddress: input.defaultAddress?.trim() || null,
    },
  });

  return { ok: true as const, ...(await issueClientPortalVerificationToken(email)) };
}

export async function verifyClientPortalAccount(token: string) {
  const email = await consumeClientPortalToken(token, "VERIFY_ACCOUNT");
  if (!email) return null;
  const updated = await prisma.clientPortalAccount.updateMany({
    where: { email, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
  return updated.count === 1 ? email : null;
}

export async function verifyClientPortalCredentials(emailInput: string, password: string) {
  const email = normalizeClientPortalEmail(emailInput);
  const account = await prisma.clientPortalAccount.findUnique({ where: { email } });
  if (!account?.emailVerifiedAt) return null;
  return (await bcrypt.compare(password, account.passwordHash)) ? account : null;
}

export async function resetClientPortalPassword(token: string, password: string) {
  const email = await consumeClientPortalToken(token, "RESET_PASSWORD");
  if (!email) return null;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [updated] = await prisma.$transaction([
    prisma.clientPortalAccount.updateMany({
      where: { email, emailVerifiedAt: { not: null } },
      data: { passwordHash },
    }),
    prisma.clientPortalSession.deleteMany({ where: { account: { email } } }),
  ]);
  return updated.count === 1 ? email : null;
}

export async function getClientPortalProfile(emailInput: string) {
  const email = normalizeClientPortalEmail(emailInput);
  const account = await prisma.clientPortalAccount.findUnique({
    where: { email },
    select: { name: true, email: true, phone: true, rut: true, defaultAddress: true, emailVerifiedAt: true },
  });
  if (!account?.emailVerifiedAt) return null;
  return {
    name: account.name,
    email: account.email,
    phone: account.phone ?? "",
    rut: account.rut ?? "",
    address: account.defaultAddress ?? "",
    profileComplete: Boolean(account.name.trim() && account.phone?.trim()),
  };
}

export async function updateClientPortalProfile(emailInput: string, input: {
  name: string;
  phone: string;
  rut?: string | null;
  defaultAddress?: string | null;
}) {
  const email = normalizeClientPortalEmail(emailInput);
  const updated = await prisma.clientPortalAccount.updateMany({
    where: { email, emailVerifiedAt: { not: null } },
    data: {
      name: input.name.trim(),
      phone: input.phone.trim(),
      rut: input.rut?.trim() || null,
      defaultAddress: input.defaultAddress?.trim() || null,
    },
  });
  return updated.count === 1 ? getClientPortalProfile(email) : null;
}

export async function changeClientPortalPassword(emailInput: string, currentPassword: string, newPassword: string) {
  const email = normalizeClientPortalEmail(emailInput);
  const account = await prisma.clientPortalAccount.findUnique({ where: { email } });
  if (!account?.emailVerifiedAt || !(await bcrypt.compare(currentPassword, account.passwordHash))) return false;
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.$transaction([
    prisma.clientPortalAccount.update({ where: { id: account.id }, data: { passwordHash } }),
    prisma.clientPortalSession.deleteMany({ where: { accountId: account.id } }),
  ]);
  return true;
}

export async function updateClientPortalProfileFromBooking(input: {
  sessionEmail: string | null;
  customerEmail: string;
  name: string;
  phone: string;
  rut?: string | null;
  address?: string | null;
}) {
  const email = normalizeClientPortalEmail(input.customerEmail);
  if (!input.sessionEmail || normalizeClientPortalEmail(input.sessionEmail) !== email) return;
  await prisma.clientPortalAccount.updateMany({
    where: { email, emailVerifiedAt: { not: null } },
    data: {
      name: input.name.trim(),
      phone: input.phone.trim(),
      ...(input.rut?.trim() ? { rut: input.rut.trim() } : {}),
      ...(input.address?.trim() ? { defaultAddress: input.address.trim() } : {}),
    },
  });
}

export function createClientPortalSessionToken(
  email: string,
  maxAgeSeconds = CLIENT_PORTAL_LEGACY_SESSION_SECONDS,
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

export async function createClientPortalAccountSession(
  emailInput: string,
  maxAgeSeconds = CLIENT_PORTAL_SESSION_SECONDS,
): Promise<string> {
  const email = normalizeClientPortalEmail(emailInput);
  const account = await prisma.clientPortalAccount.findUnique({
    where: { email },
    select: { id: true, emailVerifiedAt: true },
  });

  // Keep old magic-link access working for customers who have not activated an account yet.
  if (!account?.emailVerifiedAt) return createClientPortalSessionToken(email);

  const token = `${ACCOUNT_SESSION_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + maxAgeSeconds * 1000);
  await prisma.$transaction([
    prisma.clientPortalSession.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.clientPortalSession.create({
      data: { accountId: account.id, tokenHash: hashClientPortalToken(token), expiresAt, lastUsedAt: now },
    }),
  ]);
  return token;
}

export async function resolveClientPortalSessionToken(token: string): Promise<string | null> {
  if (!ACCOUNT_SESSION_PATTERN.test(token)) return verifyClientPortalSessionToken(token);
  const now = new Date();
  const session = await prisma.clientPortalSession.findUnique({
    where: { tokenHash: hashClientPortalToken(token) },
    select: {
      id: true,
      expiresAt: true,
      account: { select: { email: true, emailVerifiedAt: true } },
    },
  });
  if (!session?.account.emailVerifiedAt || session.expiresAt <= now) return null;
  await prisma.clientPortalSession.updateMany({
    where: { id: session.id, expiresAt: { gt: now } },
    data: { lastUsedAt: now },
  });
  return normalizeClientPortalEmail(session.account.email);
}

export async function renewClientPortalSessionToken(token: string): Promise<boolean> {
  if (!ACCOUNT_SESSION_PATTERN.test(token)) return false;
  const now = new Date();
  const result = await prisma.clientPortalSession.updateMany({
    where: { tokenHash: hashClientPortalToken(token), expiresAt: { gt: now } },
    data: {
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + CLIENT_PORTAL_SESSION_SECONDS * 1000),
    },
  });
  return result.count === 1;
}

export async function revokeClientPortalSessionToken(token: string | undefined): Promise<void> {
  if (!token || !ACCOUNT_SESSION_PATTERN.test(token)) return;
  await prisma.clientPortalSession.deleteMany({ where: { tokenHash: hashClientPortalToken(token) } });
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
  return token ? resolveClientPortalSessionToken(token) : null;
}

export async function getClientPortalEmailFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  return token ? resolveClientPortalSessionToken(token) : null;
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
