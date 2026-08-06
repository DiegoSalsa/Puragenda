import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { addDays } from "date-fns";
import { SALT_ROUNDS, API_KEY_PREFIX, TRIAL_DURATION_DAYS, SUPERADMIN_EMAILS } from "@/core/constants";
import { toSlug } from "@/core/validators/slug";
import { applyReferralCode } from "@/server/services/affiliate.service";
import { sendWelcomeEmail, sendNewRegistrationNotification } from "@/server/email/send";
import { getCountryConfig } from "@/core/countries";
import { createPrimaryLocation } from "@/server/services/location.service";
import { type AppLocale, resolveLocale } from "@/i18n/config";

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

  // Check if IP is blacklisted (ignore local/unknown/whitelisted IPs)
  const WHITELISTED_IPS = (process.env.WHITELISTED_IPS || "").split(",").map(i => i.trim()).filter(Boolean);
  const LOCAL_IPS = ["unknown", "::1", "127.0.0.1", "localhost", ...WHITELISTED_IPS];
  if (ip && !LOCAL_IPS.includes(ip)) {
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
  countryCode: string;
  timezone?: string;
  currencyCode?: string;
  ip?: string | null;
  referralCode?: string | null;
  planIntent?: "INDIVIDUAL" | "EQUIPO" | "TEST" | null;
  extraStaffCount?: number;
  locale?: AppLocale;
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

    const region = getCountryConfig(data.countryCode);
    const business = await tx.business.create({
      data: {
        name: businessName,
        slug,
        apiKey: createApiKey(),
        ownerId: user.id,
        countryCode: region.code,
        currencyCode: data.currencyCode || region.currency,
        timezone: data.timezone || region.timezone,
        locale: resolveLocale(data.locale),
      },
      select: { id: true, name: true, slug: true, timezone: true, locale: true },
    });

    const ownerStaff = await tx.staff.create({
      data: { name: data.name, email: data.email, businessId: business.id, userId: user.id, isActive: true },
    });

    await createPrimaryLocation(tx, business, ownerStaff.id);

    // Determine subscription plan and status
    const planIntent = data.planIntent;
    const trialEligiblePlans = ["INDIVIDUAL", "EQUIPO"] as const;
    const isTrialPlan = !planIntent || (trialEligiblePlans as readonly string[]).includes(planIntent);
    const givesTrial = !trialBlocked && isTrialPlan;

    let plan: "INDIVIDUAL" | "EQUIPO" | "TEST";
    let status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "INACTIVE" | "CANCELLED";
    let isTrial = false;
    let trialEndsAt: Date | null = null;

    if (givesTrial) {
      // Eligible for trial → keep chosen plan (default EQUIPO) in TRIALING
      plan = planIntent === "INDIVIDUAL" ? "INDIVIDUAL" : "EQUIPO";
      status = "TRIALING";
      isTrial = true;
      trialEndsAt = addDays(now, TRIAL_DURATION_DAYS);
    } else if (planIntent) {
      // User chose a specific plan → INACTIVE until they pay via MercadoPago
      plan = planIntent;
      status = "INACTIVE";
    } else {
      // No trial, no plan intent → INDIVIDUAL INACTIVE (must pay)
      plan = "INDIVIDUAL";
      status = "INACTIVE";
    }

    await tx.subscription.create({
      data: {
        businessId: business.id,
        plan,
        status,
        isTrial,
        trialEndsAt,
        extraStaffCount: plan === "EQUIPO" ? Math.max(0, Math.min(20, Math.floor(data.extraStaffCount ?? 0))) : 0,
      },
    });

    // Record IP for future fraud detection
    const WHITELISTED_IPS = (process.env.WHITELISTED_IPS || "").split(",").map(i => i.trim()).filter(Boolean);
    const LOCAL_IPS = ["unknown", "::1", "127.0.0.1", "localhost", ...WHITELISTED_IPS];
    if (ip && givesTrial && !LOCAL_IPS.includes(ip)) {
      await tx.blacklistedIp.upsert({
        where: { ip },
        create: { ip, reason: "Trial usado", userId: user.id },
        update: {},
      });
    }

    return { user, business, givesTrial, plan };
  });

  // Apply referral code if provided (outside transaction for affiliate service calls)
  if (data.referralCode && data.referralCode.trim()) {
    await applyReferralCode(created.business.id, data.referralCode.trim());
  }

  // Send welcome email (fire and forget)
  sendWelcomeEmail(created.user.email, created.user.name, created.business.name, resolveLocale(created.business.locale)).catch(() => {});

  // Notify platform admins about new registration (fire and forget)
  sendNewRegistrationNotification({
    ownerName: created.user.name,
    ownerEmail: created.user.email,
    businessName: created.business.name,
    plan: created.plan,
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
