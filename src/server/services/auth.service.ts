import { prisma } from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { SALT_ROUNDS, API_KEY_PREFIX } from "@/core/constants";
import { toSlug } from "@/core/validators/slug";

async function generateUniqueBusinessSlug(
  baseSlug: string,
  tx: Prisma.TransactionClient
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await tx.business.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

function createApiKey(): string {
  return `${API_KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

/**
 * Register a new user with hashed password.
 * Creates a Business + FREE Subscription + default Staff in a transaction.
 */
export async function registerUser(data: {
  email: string;
  password: string;
  name: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    return { success: false as const, error: "Ya existe una cuenta con ese email" };
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: "OWNER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const businessName = `${data.name} Negocio`;
    const baseSlug = toSlug(data.name);
    const slug = await generateUniqueBusinessSlug(baseSlug, tx);

    const business = await tx.business.create({
      data: {
        name: businessName,
        slug,
        apiKey: createApiKey(),
        ownerId: user.id,
        timezone: "America/Santiago",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    // Create default staff member for the owner
    await tx.staff.create({
      data: {
        name: data.name,
        email: data.email,
        businessId: business.id,
        userId: user.id,
        isActive: true,
      },
    });

    // Create FREE subscription
    await tx.subscription.create({
      data: {
        businessId: business.id,
        plan: "FREE",
        status: "ACTIVE",
      },
    });

    return { user, business };
  });

  return {
    success: true as const,
    user: created.user,
    business: created.business,
  };
}

/**
 * Verify user credentials and return user data (without password).
 */
export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
