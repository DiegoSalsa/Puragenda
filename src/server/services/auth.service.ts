import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { addDays } from "date-fns";
import { SALT_ROUNDS, API_KEY_PREFIX, TRIAL_DURATION_DAYS, SUPERADMIN_EMAILS } from "@/core/constants";
import { toSlug } from "@/core/validators/slug";
import { applyReferralCode, incrementPaidReferrals } from "@/server/services/affiliate.service";
import { sendWelcomeEmail, sendNewRegistrationNotification } from "@/server/email/send";

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
 * Optionally links to an affiliate via referralCode.
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
  businessName: string;
  ip?: string | null;
  referralCode?: string | null;
  planIntent?: "INDIVIDUAL" | "EQUIPO" | "TEST" | null;
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
        role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
        isSuperAdmin,
        registrationIp: ip,
        trialUsedAt: trialBlocked ? null : now,
        termsAcceptedAt: now,
      },
      select: { id: true, email: true, name: true, role: true, isSuperAdmin: true, createdAt: true },
    });

    const businessName = data.businessName;
    const baseSlug = toSlug(data.businessName);
    const slug = await generateUniqueBusinessSlug(baseSlug, tx);

    const business = await tx.business.create({
      data: { name: businessName, slug, apiKey: createApiKey(), ownerId: user.id, timezone: "America/Santiago" },
      select: { id: true, name: true, slug: true },
    });

    await tx.staff.create({
      data: { name: data.name, email: data.email, businessId: business.id, userId: user.id, isActive: true },
    });

    // Determine subscription plan and status
    const planIntent = data.planIntent;
    const givesTrial = !trialBlocked && (!planIntent || planIntent === "EQUIPO");

    let plan: "INDIVIDUAL" | "EQUIPO" | "TEST";
    let status: "ACTIVE" | "TRIALING" | "INACTIVE" | "CANCELLED";
    let isTrial = false;
    let trialEndsAt: Date | null = null;

    if (planIntent && !givesTrial) {
      // User chose a specific plan Ã¢â€ â€™ INACTIVE until they pay via MercadoPago
      plan = planIntent;
      status = "INACTIVE";
    } else if (givesTrial && (!planIntent || planIntent === "EQUIPO")) {
      // Eligible for trial Ã¢â€ â€™ EQUIPO TRIALING
      plan = "EQUIPO";
      status = "TRIALING";
      isTrial = true;
      trialEndsAt = addDays(now, TRIAL_DURATION_DAYS);
    } else {
      // No trial, no plan intent Ã¢â€ â€™ INDIVIDUAL INACTIVE (must pay)
      plan = "INDIVIDUAL";
      status = "INACTIVE";
    }

    await tx.subscription.create({
      data: { businessId: business.id, plan, status, isTrial, trialEndsAt },
    });

    // Record IP for future fraud detection
    if (ip && givesTrial) {
      await tx.blacklistedIp.upsert({
        where: { ip },
        create: { ip, reason: "Trial usado", userId: user.id },
        update: {},
      });
    }

    return { user, business, givesTrial };
  });

  // Apply referral code if provided (outside transaction for affiliate service calls)
  if (data.referralCode && data.referralCode.trim()) {
    await applyReferralCode(created.business.id, data.referralCode.trim());
  }

  // Send welcome email (fire and forget)
  sendWelcomeEmail(created.user.email, created.user.name, created.business.name).catch(() => {});

  // Notify platform admins about new registration (fire and forget)
  sendNewRegistrationNotification({
    ownerName: created.user.name,
    ownerEmail: created.user.email,
    businessName: created.business.name,
    plan: created.givesTrial ? "EQUIPO" : "INDIVIDUAL",
    hasTrial: created.givesTrial,
  }).catch(() => {});

  return { success: true as const, user: created.user, business: created.business };
}

/**
 * Verify user credentials.
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.deletedAt !== null) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    isSuperAdmin: user.isSuperAdmin, createdAt: user.createdAt, updatedAt: user.updatedAt,
  };
}
