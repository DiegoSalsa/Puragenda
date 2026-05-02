"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { SALT_ROUNDS, API_KEY_PREFIX, SUPERADMIN_EMAILS } from "@/core/constants";
import { toSlug } from "@/core/validators/slug";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

async function requireSuperAdmin() {
  const user = await getCurrentSessionUser();
  if (!user || !user.isSuperAdmin) {
    throw new Error("Acceso denegado");
  }
  return user;
}

function createApiKey(): string {
  return `${API_KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;
  while (true) {
    const existing = await prisma.business.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

// ═══════════════════════════════════════════
// CREATE BUSINESS
// ═══════════════════════════════════════════

export async function createBusinessAction(data: {
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  businessName: string;
  plan: "INDIVIDUAL" | "BASIC" | "PRO";
}) {
  await requireSuperAdmin();

  const trimmedEmail = data.ownerEmail.trim().toLowerCase();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existingUser) {
    return { error: "Ya existe un usuario con ese email" };
  }

  const hashedPassword = await bcrypt.hash(data.ownerPassword, SALT_ROUNDS);
  const isSuperAdmin = SUPERADMIN_EMAILS.includes(trimmedEmail);
  const baseSlug = toSlug(data.businessName);
  const slug = await generateUniqueSlug(baseSlug);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: trimmedEmail,
          password: hashedPassword,
          name: data.ownerName.trim(),
          role: isSuperAdmin ? "SUPERADMIN" : "ADMIN",
          isSuperAdmin,
        },
      });

      const business = await tx.business.create({
        data: {
          name: data.businessName.trim(),
          slug,
          apiKey: createApiKey(),
          ownerId: user.id,
          timezone: "America/Santiago",
        },
      });

      await tx.staff.create({
        data: {
          name: data.ownerName.trim(),
          email: trimmedEmail,
          businessId: business.id,
          userId: user.id,
          isActive: true,
        },
      });

      await tx.subscription.create({
        data: {
          businessId: business.id,
          plan: data.plan,
          status: "ACTIVE",
          billingCycle: "MONTHLY",
        },
      });
    });

    revalidatePath("/para/x7k9m2v4q8");
    return { success: true };
  } catch (err) {
    console.error("[Admin] Error creating business:", err);
    return { error: "Error al crear el negocio" };
  }
}

// ═══════════════════════════════════════════
// UPDATE SUBSCRIPTION
// ═══════════════════════════════════════════

export async function updateSubscriptionAction(
  subscriptionId: string,
  data: {
    plan?: "INDIVIDUAL" | "BASIC" | "PRO";
    status?: "ACTIVE" | "TRIALING" | "INACTIVE" | "CANCELLED";
    billingCycle?: "MONTHLY" | "ANNUAL";
    isTrial?: boolean;
    extraStaffCount?: number;
  }
) {
  await requireSuperAdmin();

  try {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        ...(data.plan && { plan: data.plan }),
        ...(data.status && { status: data.status }),
        ...(data.billingCycle && { billingCycle: data.billingCycle }),
        ...(data.isTrial !== undefined && { isTrial: data.isTrial }),
        ...(data.extraStaffCount !== undefined && { extraStaffCount: data.extraStaffCount }),
      },
    });

    revalidatePath("/para/x7k9m2v4q8");
    return { success: true };
  } catch (err) {
    console.error("[Admin] Error updating subscription:", err);
    return { error: "Error al actualizar la suscripción" };
  }
}

// ═══════════════════════════════════════════
// DELETE BUSINESS
// ═══════════════════════════════════════════

export async function deleteBusinessAction(businessId: string) {
  await requireSuperAdmin();

  try {
    // Get business to find owner
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    if (!business) {
      return { error: "Negocio no encontrado" };
    }

    // Delete business (cascades delete related records)
    await prisma.business.delete({ where: { id: businessId } });

    // Check if owner has other businesses, if not delete user too
    if (business.ownerId) {
      const otherBusinesses = await prisma.business.count({
        where: { ownerId: business.ownerId },
      });

      if (otherBusinesses === 0) {
        // Check it's not a superadmin
        const user = await prisma.user.findUnique({
          where: { id: business.ownerId },
          select: { isSuperAdmin: true },
        });

        if (!user?.isSuperAdmin) {
          await prisma.user.delete({ where: { id: business.ownerId } });
        }
      }
    }

    revalidatePath("/para/x7k9m2v4q8");
    return { success: true };
  } catch (err) {
    console.error("[Admin] Error deleting business:", err);
    return { error: "Error al eliminar el negocio" };
  }
}
