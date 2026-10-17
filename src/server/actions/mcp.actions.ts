"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";

export async function revokeMcpConnection(form: FormData) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("No autenticado");
  const connectionId = z.string().uuid().parse(form.get("connectionId"));
  const business = await getBusinessForUser(user.id);
  const owner = business?.ownerId === user.id;
  await prisma.$transaction(async (db) => {
    const result = await db.mcpConnection.updateMany({ where: { id: connectionId, revokedAt: null, OR: [{ profile: { userId: user.id } }, ...(owner ? [{ profile: { businessId: business!.id } }] : [])] }, data: { revokedAt: new Date() } });
    if (result.count) await db.auditLog.create({ data: { userId: user.id, action: "MCP_CONNECTION_REVOKED", details: JSON.stringify({ connectionId }) } });
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/integraciones/chatgpt/conexiones");
}
export async function updateMcpPublicDiscovery(form: FormData) {
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("No autenticado");
  const business = await getBusinessForUser(user.id);
  if (!business || !(await hasBusinessPermission(user, business, P.SETTINGS_MANAGE))) throw new Error("Sin permisos");
  const enabled = form.get("enabled") === "on";
  await prisma.$transaction(async (db) => {
    await db.business.update({ where: { id: business.id }, data: { mcpPublicDiscovery: enabled } });
    await db.auditLog.create({ data: { userId: user.id, action: "MCP_PUBLIC_DISCOVERY_CHANGED", details: JSON.stringify({ businessId: business.id, enabled }) } });
  });
  revalidatePath("/dashboard/settings");
}
