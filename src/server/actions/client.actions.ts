"use server";

import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { revalidatePath } from "next/cache";

// ==========================================
// CLIENT PRIVATE NOTES (CRM light)
// ==========================================

export async function updateClientNotesAction(clientId: string, notes: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

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
// CLIENT RUT
// ==========================================

export async function updateClientRutAction(clientId: string, rut: string) {
  const user = await getCurrentSessionUser();
  if (!user) return { error: "No autenticado" };

  const business = await getBusinessForUser(user.id);
  if (!business) return { error: "No tienes un negocio" };

  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: business.id },
  });
  if (!client) return { error: "Cliente no encontrado" };

  // Basic RUT format validation (Chilean RUT: XX.XXX.XXX-X or XXXXXXXX-X)
  const rutClean = rut.replace(/\./g, "").trim();
  if (rutClean && !/^\d{7,8}-[\dkK]$/.test(rutClean)) {
    return { error: "Formato de RUT invalido. Usa el formato 12345678-9" };
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { rut: rutClean || null },
  });

  revalidatePath("/dashboard/clients");
  return { success: true };
}
