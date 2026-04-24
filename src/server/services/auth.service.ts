import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { addDays } from "date-fns";
import { SALT_ROUNDS, API_KEY_PREFIX, TRIAL_DURATION_DAYS, SUPERADMIN_EMAILS } from "@/core/constants";
import { toSlug } from "@/core/validators/slug";

async function generateUniqueBusinessSlug(
  baseSlug: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await tx.business.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

function createApiKey(): string {
  return `${API_KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Check if IP or email has already used a trial.
 * Returns true if trial should be BLOCKED.
 */
async function isTrialBlocked(email: string, ip: string | null): Promise<boolean> {
  // Check if email already used trial
  const existingUser = await prisma.user.findFirst({
    where: { email, trialUsedAt: { not: null } },
  });
  if (existingUser) return true;

  // Check if IP is blacklisted
  if (ip) {
    const blacklisted = await prisma.blacklistedIp.findUnique({ where: { ip } });
    if (blacklisted) return true;

    // Check if another user with this IP already used a trial
    const ipUser = await prisma.user.findFirst({
      where: { registrationIp: ip, trialUsedAt: { not: null } },
    });
    if (ipUser) return true;
  }

  return false;
}

/**
 * Register a new user with hashed password.
 * Creates Business + Subscription (with trial if eligible) + Staff.
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  ip?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { success: false as const, error: "Ya existe una cuenta con ese email" };
  }

  const ip = data.ip || null;
  const trialBlocked = await isTrialBlocked(data.email, ip);
  const isSuperAdmin = SUPERADMIN_EMAILS.includes(data.email);
  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const created = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: isSuperAdmin ? "SUPERADMIN" : "OWNER",
        isSuperAdmin,
        registrationIp: ip,
        trialUsedAt: trialBlocked ? null : now,
      },
      select: { id: true, email: true, name: true, role: true, isSuperAdmin: true, createdAt: true },
    });

    const businessName = `${data.name} Negocio`;
    const baseSlug = toSlug(data.name);
    const slug = await generateUniqueBusinessSlug(baseSlug, tx);

    const business = await tx.business.create({
      data: { name: businessName, slug, apiKey: createApiKey(), ownerId: user.id, timezone: "America/Santiago" },
      select: { id: true, name: true, slug: true },
    });

    await tx.staff.create({
      data: { name: data.name, email: data.email, businessId: business.id, userId: user.id, isActive: true },
    });

    // Subscription: trial only if not blocked
    const givesTrial = !trialBlocked;
    await tx.subscription.create({
      data: {
        businessId: business.id,
        plan: "INDIVIDUAL",
        status: givesTrial ? "TRIALING" : "ACTIVE",
        isTrial: givesTrial,
        trialEndsAt: givesTrial ? addDays(now, TRIAL_DURATION_DAYS) : null,
      },
    });

    // Record IP for future fraud detection
    if (ip && givesTrial) {
      await tx.blacklistedIp.upsert({
        where: { ip },
        create: { ip, reason: "Trial usado", userId: user.id },
        update: {},
      });
    }

    return { user, business };
  });

  return { success: true as const, user: created.user, business: created.business };
}

/**
 * Verify user credentials.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    isSuperAdmin: user.isSuperAdmin, createdAt: user.createdAt, updatedAt: user.updatedAt,
  };
}
