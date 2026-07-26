"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { normalizeDashboardPermissions } from "@/core/permissions";

async function getOwnerContext() {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" } as const;
  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" } as const;
  if (business.ownerId !== user.id && user.role !== "SUPERADMIN") {
    return { error: "Solo la cuenta owner puede administrar perfiles de acceso" } as const;
  }
  return { user, business } as const;
}

export async function saveAccessProfileAction(data: {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
  baseRole?: "ADMIN" | "RECEPTIONIST" | "STAFF";
}) {
  const context = await getOwnerContext();
  if ("error" in context) return context;
  const name = data.name.trim().slice(0, 60);
  const description = data.description.trim().slice(0, 280);
  if (name.length < 2) return { error: "El nombre debe tener al menos 2 caracteres" };
  const permissions = normalizeDashboardPermissions(data.permissions);
  if (!permissions.length) return { error: "Selecciona al menos una funcionalidad" };
  const baseRole = data.baseRole || "STAFF";

  try {
    if (data.id) {
      const existing = await prisma.accessProfile.findFirst({
        where: { id: data.id, businessId: context.business.id },
      });
      if (!existing) return { error: "Perfil no encontrado" };
      await prisma.accessProfile.update({
        where: { id: existing.id },
        data: { name, description, permissions, baseRole },
      });
    } else {
      await prisma.accessProfile.create({
        data: {
          businessId: context.business.id,
          name,
          description,
          permissions,
          baseRole,
          isSystem: false,
        },
      });
    }
    revalidatePath("/dashboard/staff");
    revalidatePath("/dashboard/staff/roles");
    return { success: true };
  } catch {
    return { error: "Ya existe un perfil con ese nombre" };
  }
}

export async function deleteAccessProfileAction(profileId: string) {
  const context = await getOwnerContext();
  if ("error" in context) return context;
  const profile = await prisma.accessProfile.findFirst({
    where: { id: profileId, businessId: context.business.id },
    include: { _count: { select: { staff: true } } },
  });
  if (!profile) return { error: "Perfil no encontrado" };
  if (profile.isSystem) return { error: "Los perfiles del sistema no se eliminan" };
  if (profile._count.staff > 0) {
    return { error: `Este perfil está asignado a ${profile._count.staff} persona(s). Reasígnalas antes de eliminarlo.` };
  }
  await prisma.accessProfile.delete({ where: { id: profile.id } });
  revalidatePath("/dashboard/staff/roles");
  return { success: true };
}

export async function updateStaffAccessProfileAction(staffId: string, accessProfileId: string | null) {
  const context = await getOwnerContext();
  if ("error" in context) return context;
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, businessId: context.business.id },
    select: { id: true, userId: true },
  });
  if (!staff) return { error: "Profesional no encontrado" };
  if (staff.userId === context.business.ownerId) return { error: "La cuenta owner conserva acceso total" };

  let baseRole: "ADMIN" | "RECEPTIONIST" | "STAFF" | null = null;
  if (accessProfileId) {
    const profile = await prisma.accessProfile.findFirst({
      where: { id: accessProfileId, businessId: context.business.id },
      select: { baseRole: true },
    });
    if (!profile) return { error: "Perfil no encontrado" };
    baseRole = profile.baseRole === "ADMIN" || profile.baseRole === "RECEPTIONIST" ? profile.baseRole : "STAFF";
  }

  await prisma.$transaction(async (tx) => {
    await tx.staff.update({
      where: { id: staff.id },
      data: { accessProfileId },
    });
    if (staff.userId && baseRole) {
      await tx.user.update({ where: { id: staff.userId }, data: { role: baseRole } });
    }
  });

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  return { success: true };
}
