"use server";

import { prisma } from "@/server/db/prisma";
import { requireSuperAdminSession } from "@/server/auth/admin-session";
import { createSessionToken, getSessionCookieOptions, AUTH_COOKIE_NAME } from "@/server/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SECRET_PATH } from "@/core/constants";

export async function impersonateBusinessAction(businessId: string) {
  await requireSuperAdminSession();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { owner: true }
  });

  if (!business || !business.owner) {
    return { error: "Negocio o propietario no encontrado" };
  }

  const token = createSessionToken({
    id: business.owner.id,
    email: business.owner.email,
    name: business.owner.name,
    role: business.owner.role,
    isSuperAdmin: business.owner.isSuperAdmin,
    tokenVersion: business.owner.tokenVersion,
    adminAccess: false,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

  redirect("/dashboard");
}

export async function exitImpersonationAction() {
  const admin = await requireSuperAdminSession();

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
