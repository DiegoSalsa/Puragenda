"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";
import { normalizeAndValidateTaxId } from "@/core/countries";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

// ==========================================
// CLIENT PRIVATE NOTES (CRM light)
// ==========================================

export async function updateClientNotesAction(clientId: string, notes: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE))) {
    return { error: "No tienes permisos para modificar clientes" };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: business.id },
  });
  if (!client) return { error: "Cliente no encontrado" };

  await prisma.client.update({
    where: { id: clientId },
    data: { privateNotes: notes || null },
  });

  revalidatePath("/dashboard/clients");
  return { success: true };
}

// ==========================================
// CLIENT TAX ID (stored in the legacy `rut` column)
// ==========================================

export async function updateClientRutAction(clientId: string, rut: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.CLIENTS_MANAGE))) {
    return { error: "No tienes permisos para modificar clientes" };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: business.id },
  });
  if (!client) return { error: "Cliente no encontrado" };

  const taxId = normalizeAndValidateTaxId(business.countryCode, rut);
  if (taxId.error) return { error: taxId.error };

  await prisma.client.update({
    where: { id: clientId },
    data: { rut: taxId.value || null },
  });

  revalidatePath("/dashboard/clients");
  return { success: true };
}
