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
  plan: "INDIVIDUAL" | "EQUIPO";
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
    plan?: "INDIVIDUAL" | "EQUIPO";
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

// ═══════════════════════════════════════════
// EXTEND TRIAL
// ═══════════════════════════════════════════

export async function extendTrialAction(subscriptionId: string, days: number) {
  await requireSuperAdmin();

  if (days < 1 || days > 365) return { error: "Días inválidos (1-365)" };

  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { trialEndsAt: true, status: true },
    });

    if (!sub) return { error: "Suscripción no encontrada" };

    const base = sub.trialEndsAt && sub.trialEndsAt > new Date() ? sub.trialEndsAt : new Date();
    const newTrialEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        trialEndsAt: newTrialEndsAt,
        isTrial: true,
        status: "TRIALING",
        trialWarningEmailSent: false,
      },
    });

    revalidatePath("/para/x7k9m2v4q8");
    return { success: true, newTrialEndsAt: newTrialEndsAt.toISOString() };
  } catch (err) {
    console.error("[Admin] Error extending trial:", err);
    return { error: "Error al extender el trial" };
  }
}

// ═══════════════════════════════════════════
// RESET USER PASSWORD
// ═══════════════════════════════════════════

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  await requireSuperAdmin();

  if (!newPassword || newPassword.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres" };

  try {
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });
    return { success: true };
  } catch (err) {
    console.error("[Admin] Error resetting password:", err);
    return { error: "Error al resetear la contraseña" };
  }
}

// ═══════════════════════════════════════════
// DEACTIVATE USER
// ═══════════════════════════════════════════

export async function deactivateUserAction(userId: string) {
  await requireSuperAdmin();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
    if (!user) return { error: "Usuario no encontrado" };
    if (user.isSuperAdmin) return { error: "No se puede desactivar un superadmin" };

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), tokenVersion: { increment: 1 } },
    });

    revalidatePath("/para/x7k9m2v4q8");
    return { success: true };
  } catch (err) {
    console.error("[Admin] Error deactivating user:", err);
    return { error: "Error al desactivar el usuario" };
  }
}

// ═══════════════════════════════════════════
// REACTIVATE USER
// ═══════════════════════════════════════════

export async function reactivateUserAction(userId: string) {
  await requireSuperAdmin();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });
    revalidatePath("/para/x7k9m2v4q8");
    return { success: true };
  } catch (err) {
    console.error("[Admin] Error reactivating user:", err);
    return { error: "Error al reactivar el usuario" };
  }
}

// ═══════════════════════════════════════════
// SEND MASS EMAIL
// ═══════════════════════════════════════════

export async function sendMassEmailAction(data: {
  segment: "ALL" | "TRIALING" | "ACTIVE" | "CANCELLED";
  subject: string;
  body: string;
}) {
  await requireSuperAdmin();

  if (!data.subject.trim() || !data.body.trim()) return { error: "Asunto y cuerpo son requeridos" };

  try {
    // Get users based on segment
    let users: { email: string; name: string }[] = [];

    if (data.segment === "ALL") {
      users = await prisma.user.findMany({
        where: { deletedAt: null, role: "ADMIN" },
        select: { email: true, name: true },
      });
    } else {
      const status = data.segment as "TRIALING" | "ACTIVE" | "CANCELLED";
      const businesses = await prisma.business.findMany({
        where: {
          subscription: { status },
          owner: { deletedAt: null },
        },
        select: { owner: { select: { email: true, name: true } } },
      });
      users = businesses
        .map((b) => b.owner)
        .filter((o): o is { email: string; name: string } => !!o?.email);
    }

    // Deduplicate by email
    const unique = Array.from(new Map(users.map((u) => [u.email, u])).values());

    const { resend, EMAIL_FROM } = await import("@/server/email/resend");

    let sent = 0;
    let failed = 0;

    for (const user of unique) {
      const result = await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: data.subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #7C3AED;">Hola ${user.name},</h2>
            <div style="margin-top: 16px; line-height: 1.6; color: #333;">
              ${data.body.replace(/\n/g, "<br/>")}
            </div>
            <hr style="margin-top: 32px; border-color: #eee;" />
            <p style="color: #999; font-size: 12px;">Puragenda · Tu agenda online</p>
          </div>
        `,
      });
      if (result.error) failed++;
      else sent++;
    }

    return { success: true, sent, failed, total: unique.length };
  } catch (err) {
    console.error("[Admin] Error sending mass email:", err);
    return { error: "Error al enviar los emails" };
  }
}

// ═══════════════════════════════════════════
// ADD ADMIN NOTE TO BUSINESS
// ═══════════════════════════════════════════

export async function addAdminNoteAction(businessId: string, note: string) {
  const user = await requireSuperAdmin();
  try {
    await prisma.auditLog.create({
      data: {
        action: "ADMIN_NOTE",
        details: JSON.stringify({ businessId, note }),
        userId: user.id,
      },
    });
    revalidatePath(`/para/x7k9m2v4q8/businesses/${businessId}`);
    return { success: true };
  } catch (err) {
    console.error("[Admin] Error adding note:", err);
    return { error: "Error al guardar la nota" };
  }
}
