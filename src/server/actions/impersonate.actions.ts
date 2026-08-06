"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { createSessionToken, getSessionCookieOptions, AUTH_COOKIE_NAME } from "@/server/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function impersonateBusinessAction(businessId: string) {
  const admin = await getCurrentSessionUser();
  if (!admin || !admin.isSuperAdmin || !admin.adminAccess) {
    throw new Error("Acceso denegado");
  }

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
    adminAccess: false,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());

  redirect("/dashboard");
}
