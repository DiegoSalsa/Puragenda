"use server";

import { prisma } from "@/server/db/prisma";
import { requireSuperAdminSession } from "@/server/auth/admin-session";
import { createSessionToken, getSessionCookieOptions, AUTH_COOKIE_NAME } from "@/server/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { getBusinessForUser } from "@/server/services/business.service";
import type { SessionUser } from "@/core/entities";

const targetUserSelect = { id: true, email: true, name: true, role: true, isSuperAdmin: true, tokenVersion: true, deletedAt: true } as const;

async function startImpersonation(adminId: string, businessId: string, user: SessionUser & { deletedAt: Date | null }, staffId?: string) {
  if (user.deletedAt || user.isSuperAdmin || user.role === "SUPERADMIN") return { error: "Esta cuenta no está disponible para suplantación." };
  const targetBusiness = await getBusinessForUser(user.id);
  if (targetBusiness?.id !== businessId) return { error: "La cuenta no tiene acceso a este negocio como cuenta principal." };
  const token = createSessionToken({
    id: user.id, email: user.email, name: user.name, role: user.role,
    isSuperAdmin: false, tokenVersion: user.tokenVersion, adminAccess: false,
  });
  await prisma.auditLog.create({ data: {
    userId: adminId,
    action: "ADMIN_IMPERSONATION_STARTED",
    details: JSON.stringify({ businessId, targetUserId: user.id, staffId: staffId ?? null }),
  } });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
  redirect("/dashboard");
}

export async function impersonateBusinessAction(businessId: string) {
  const admin = await requireSuperAdminSession();
  if (admin.sessionId === "legacy") return { error: "Inicia sesión nuevamente en el Superadmin para conservar tu acceso al entrar en otra cuenta." };
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { owner: { select: targetUserSelect } },
  });

  if (!business || !business.owner) {
    return { error: "Negocio o propietario no encontrado" };
  }

  return startImpersonation(admin.id, businessId, business.owner);
}

export async function impersonateStaffAction(businessId: string, staffId: string) {
  const admin = await requireSuperAdminSession();
  if (admin.sessionId === "legacy") return { error: "Inicia sesión nuevamente en el Superadmin para conservar tu acceso al entrar en otra cuenta." };
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, businessId, isActive: true },
    select: { id: true, user: { select: targetUserSelect } },
  });
  if (!staff?.user) return { error: "El profesional no tiene una cuenta de acceso activa en este negocio." };
  return startImpersonation(admin.id, businessId, staff.user, staff.id);
}

export async function exitImpersonationAction() {
  const admin = await requireSuperAdminSession();

  await prisma.auditLog.create({ data: { userId: admin.id, action: "ADMIN_IMPERSONATION_ENDED" } });

  const token = createSessionToken({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    isSuperAdmin: admin.isSuperAdmin,
    tokenVersion: admin.tokenVersion,
    adminAccess: false,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

  redirect(ADMIN_SECRET_PATH);
}
