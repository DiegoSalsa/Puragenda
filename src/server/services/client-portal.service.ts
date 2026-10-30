import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "@/core/constants";
import type { ClientPortalTokenPurpose, Prisma } from "@prisma/client";

export const CLIENT_PORTAL_COOKIE_NAME = "puragenda_client_portal";
export const CLIENT_PORTAL_SESSION_SECONDS = 90 * 24 * 60 * 60;
export const CLIENT_PORTAL_IDLE_SECONDS = 30 * 24 * 60 * 60;
export const CLIENT_PORTAL_LEGACY_SESSION_SECONDS = 30 * 24 * 60 * 60;
export const CLIENT_PORTAL_LINK_MINUTES = 15;
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
  db: Prisma.TransactionClient = prisma,
) {
  const normalizedEmail = normalizeClientPortalEmail(email);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + lifetimeMinutes * 60 * 1000);

  await db.clientPortalToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  await db.clientPortalToken.create({
      data: { email: normalizedEmail, tokenHash: hashClientPortalToken(token), expiresAt, purpose, authenticationIntent: true },
    });

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

export async function consumeClientPortalToken(
  token: string,
  purpose?: ClientPortalTokenPurpose,
  db: Prisma.TransactionClient = prisma,
): Promise<string | null> {
  if (!MAGIC_TOKEN_PATTERN.test(token)) return null;
  const tokenHash = hashClientPortalToken(token);
  const record = await db.clientPortalToken.findUnique({ where: { tokenHash } });
  if (!record || record.consumedAt || record.expiresAt <= new Date() || (purpose && record.purpose !== purpose)) return null;
  // RC1 requested login links had a 15-minute lifetime; campaign links lasted
  // 30 days. Preserve the short links without extending their original expiry.
  const legacyRequestedAccess = record.createdAt && record.expiresAt.getTime() - record.createdAt.getTime() <= CLIENT_PORTAL_LINK_MINUTES * 60000 + 1000;
  if (record.purpose === "MAGIC_ACCESS" && !record.authenticationIntent && !legacyRequestedAccess) return null;

  const result = await db.clientPortalToken.updateMany({
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

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return withPortalIdentity(email, async tx => {
  const existing = await tx.clientPortalAccount.findUnique({ where: { email } });
  if (existing?.emailVerifiedAt) {
    return { ok: false as const, error: "Esta cuenta ya está activa. Inicia sesión." };
  }

  await tx.clientPortalAccount.upsert({
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

  await tx.clientPortalToken.deleteMany({ where: { email, purpose: "VERIFY_ACCOUNT" } });
  return { ok: true as const, ...(await createClientPortalMagicToken(email, CLIENT_PORTAL_ACCOUNT_TOKEN_MINUTES, "VERIFY_ACCOUNT", tx)) };
  });
}

export async function verifyClientPortalAccount(token: string) {
  if (!MAGIC_TOKEN_PATTERN.test(token)) return null;
  const record = await prisma.clientPortalToken.findUnique({ where: { tokenHash: hashClientPortalToken(token) } });
  if (!record) return null;
  return withPortalIdentity(record.email, async tx => {
  const email = await consumeClientPortalToken(token, "VERIFY_ACCOUNT", tx);
  if (!email) return null;
  const updated = await tx.clientPortalAccount.updateMany({
    where: { email, emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });
  return updated.count === 1 ? email : null;
  });
}

export async function verifyClientPortalCredentials(emailInput: string, password: string) {
  const email = normalizeClientPortalEmail(emailInput);
  const account = await prisma.clientPortalAccount.findUnique({ where: { email } });
  if (!account?.emailVerifiedAt) return null;
  return (await bcrypt.compare(password, account.passwordHash)) ? account : null;
}

export async function resetClientPortalPassword(token: string, password: string) {
  if (!MAGIC_TOKEN_PATTERN.test(token)) return null;
  const record = await prisma.clientPortalToken.findUnique({ where: { tokenHash: hashClientPortalToken(token) } });
  if (!record || record.purpose !== "RESET_PASSWORD" || record.consumedAt || record.expiresAt <= new Date()) return null;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return withPortalIdentity(record.email, async tx => {
    const email = await consumeClientPortalToken(token, "RESET_PASSWORD", tx);
    if (!email) return null;
    const updated = await tx.clientPortalAccount.updateMany({
      where: { email, emailVerifiedAt: { not: null } },
      data: { passwordHash },
    });
    if (updated.count !== 1) return null;
    await invalidatePortalIdentity(tx, email);
    return email;
  });
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
  return withPortalIdentity(email, async tx => {
    const updated = await tx.clientPortalAccount.updateMany({ where: { id: account.id, passwordHash: account.passwordHash }, data: { passwordHash } });
    if (updated.count !== 1) return false;
    await invalidatePortalIdentity(tx, email);
    return true;
  });
}

async function withPortalIdentity<T>(email: string, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 4101))`;
    return work(tx);
  });
}

async function invalidatePortalIdentity(tx: Prisma.TransactionClient, email: string) {
  await tx.clientPortalIdentity.upsert({ where: { email }, create: { email, legacyInvalidBefore: new Date() }, update: { legacyInvalidBefore: new Date() } });
  await tx.clientPortalSession.deleteMany({ where: { OR: [{ email }, { account: { email } }] } });
  await tx.clientPortalToken.deleteMany({ where: { email } });
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
      !Number.isFinite(payload.exp) ||
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
  expectedPasswordHash?: string,
): Promise<string> {
  const email = normalizeClientPortalEmail(emailInput);
  return withPortalIdentity(email, tx => createPortalSession(tx, email, maxAgeSeconds, expectedPasswordHash));
}

async function createPortalSession(tx: Prisma.TransactionClient, email: string, maxAgeSeconds = CLIENT_PORTAL_SESSION_SECONDS, expectedPasswordHash?: string) {
    let account = await tx.clientPortalAccount.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true, passwordHash: true } });
    if (expectedPasswordHash && (!account?.emailVerifiedAt || account.passwordHash !== expectedPasswordHash)) throw new Error("PORTAL_CREDENTIAL_CHANGED");
    // Keep the existing non-null account relation compatible with RC1. This
    // placeholder cannot use password login until the activation flow completes.
    account ??= await tx.clientPortalAccount.create({ data: { email, name: "Cliente", passwordHash: `disabled:${crypto.randomBytes(32).toString("hex")}` }, select: { id: true, emailVerifiedAt: true, passwordHash: true } });
    const token = `${ACCOUNT_SESSION_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.min(maxAgeSeconds, CLIENT_PORTAL_SESSION_SECONDS) * 1000);
    await tx.clientPortalSession.create({ data: { email, accountId: account.id, tokenHash: hashClientPortalToken(token), expiresAt, lastUsedAt: now } });
    return token;
}

export async function consumeClientPortalAccessSession(token: string) {
  if (!MAGIC_TOKEN_PATTERN.test(token)) return null;
  const record = await prisma.clientPortalToken.findUnique({ where: { tokenHash: hashClientPortalToken(token) } });
  if (!record) return null;
  return withPortalIdentity(record.email, async tx => {
    const email = await consumeClientPortalToken(token, "MAGIC_ACCESS", tx);
    return email ? createPortalSession(tx, email) : null;
  });
}

export async function resolveClientPortalSessionToken(token: string): Promise<string | null> {
  if (!ACCOUNT_SESSION_PATTERN.test(token)) {
    const email = verifyClientPortalSessionToken(token);
    if (!email) return null;
    const payload = JSON.parse(fromBase64Url(token.split(".")[0])) as ClientPortalPayload;
    const issuedAt = (payload.exp - CLIENT_PORTAL_LEGACY_SESSION_SECONDS) * 1000;
    const [identity, revoked] = await Promise.all([
      prisma.clientPortalIdentity.findUnique({ where: { email } }),
      prisma.clientPortalRevocation.findUnique({ where: { tokenHash: hashClientPortalToken(token) } }),
    ]);
    if (revoked || (identity?.legacyInvalidBefore && issuedAt <= identity.legacyInvalidBefore.getTime())) return null;
    return email;
  }
  const now = new Date();
  const session = await prisma.clientPortalSession.findUnique({
    where: { tokenHash: hashClientPortalToken(token) },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      createdAt: true,
      lastUsedAt: true,
      account: { select: { email: true, emailVerifiedAt: true } },
    },
  });
  if (!session || (!session.email && !session.account?.emailVerifiedAt)) return null;
  const updated = await prisma.clientPortalSession.updateMany({
    where: { id: session.id, ...activeSessionWhere(now) },
    data: { lastUsedAt: now },
  });
  return updated.count === 1 ? normalizeClientPortalEmail(session.email || session.account!.email) : null;
}

export async function resolveClientPortalAccountToken(token: string) {
  if (!ACCOUNT_SESSION_PATTERN.test(token)) return null;
  if (!(await resolveClientPortalSessionToken(token))) return null;
  const now = new Date();
  const session = await prisma.clientPortalSession.findUnique({
    where: { tokenHash: hashClientPortalToken(token) },
    select: {
      id: true,
      expiresAt: true,
      account: { select: { id: true, email: true, name: true, emailVerifiedAt: true } },
    },
  });
  if (!session?.account?.emailVerifiedAt) return null;
  const updated = await prisma.clientPortalSession.updateMany({
    where: { id: session.id, ...activeSessionWhere(now) },
    data: { lastUsedAt: now },
  });
  return updated.count === 1 ? { ...session.account, email: normalizeClientPortalEmail(session.account.email) } : null;
}

function activeSessionWhere(now: Date) {
  return { expiresAt: { gt: now }, createdAt: { gt: new Date(now.getTime() - CLIENT_PORTAL_SESSION_SECONDS * 1000) }, lastUsedAt: { gt: new Date(now.getTime() - CLIENT_PORTAL_IDLE_SECONDS * 1000) } };
}

export async function renewClientPortalSessionToken(token: string): Promise<boolean> {
  if (!ACCOUNT_SESSION_PATTERN.test(token)) return false;
  const now = new Date();
  const result = await prisma.clientPortalSession.updateMany({
    where: { tokenHash: hashClientPortalToken(token), ...activeSessionWhere(now) },
    data: {
      lastUsedAt: now,
    },
  });
  return result.count === 1;
}

export async function revokeClientPortalSessionToken(token: string | undefined): Promise<void> {
  if (!token) return;
  if (ACCOUNT_SESSION_PATTERN.test(token)) {
    await prisma.clientPortalSession.deleteMany({ where: { tokenHash: hashClientPortalToken(token) } });
    return;
  }
  const email = verifyClientPortalSessionToken(token);
  if (!email) return;
  const payload = JSON.parse(fromBase64Url(token.split(".")[0])) as ClientPortalPayload;
  await withPortalIdentity(email, tx => tx.clientPortalRevocation.upsert({ where: { tokenHash: hashClientPortalToken(token) }, create: { tokenHash: hashClientPortalToken(token), expiresAt: new Date(payload.exp * 1000) }, update: {} }));
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

export async function getClientPortalAccount() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  return token ? resolveClientPortalAccountToken(token) : null;
}

export async function getClientPortalAccountFromRequest(request: NextRequest) {
  const token = request.cookies.get(CLIENT_PORTAL_COOKIE_NAME)?.value;
  return token ? resolveClientPortalAccountToken(token) : null;
}

function portalEmailWhere(email: string) {
  return { portalOwnerEmail: email };
}

export async function hasClientPortalRecords(email: string): Promise<boolean> {
  const normalizedEmail = normalizeClientPortalEmail(email);
  const [client, appointment] = await Promise.all([
    prisma.client.findFirst({
      where: { portalOwnerEmail: normalizedEmail },
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
  const appointmentSelect = {
    id: true, businessId: true, locationId: true, customerName: true, startTime: true, endTime: true, status: true, recurringBookingId: true,
    location: { select: { businessId: true, timezone: true, address: true, mapsUrl: true } },
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

  const [clients, upcoming, history, plans] = await Promise.all([
    prisma.client.findMany({
      where: { portalOwnerEmail: normalizedEmail },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, name: true, currentStamps: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            currencyCode: true,
            isLoyaltyEnabled: true,
            stampsRequired: true,
            rewardName: true,
            loyaltyRewardType: true,
            discountValue: true,
            loyaltyRewardService: { select: { name: true } },
          },
        },
        loyaltyCodes: {
          where: { isUsed: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            rewardName: true,
            discountType: true,
            discountValue: true,
            rewardType: true,
            freeService: { select: { name: true } },
            expiresAt: true,
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
      select: appointmentSelect,
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
      select: appointmentSelect,
    }),
    prisma.recurringBooking.findMany({ where: { portalOwnerEmail: normalizedEmail }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, status: true, service: { select: { name: true } }, business: { select: { name: true } } } }),
  ]);

  const displayName =
    clients.find((client) => client.name.trim())?.name.trim() ||
    upcoming.find((appointment) => appointment.customerName.trim())?.customerName.trim() ||
    history.find((appointment) => appointment.customerName.trim())?.customerName.trim() ||
    "Cliente";

  return { email: normalizedEmail, displayName, clients, upcoming, history, plans };
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
