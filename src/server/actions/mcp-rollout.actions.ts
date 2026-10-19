"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ADMIN_SECRET_PATH } from "@/core/constants";
import { requireSuperAdminSession, isRecentAdminAuth, stepUpRequiredResult } from "@/server/auth/admin-session";
import { prisma } from "@/server/db/prisma";
import { mcpEnabled } from "@/server/mcp/config";
import { MCP_ROLLOUT_ID } from "@/server/mcp/rollout";

const changeSchema = z.object({
  enabled: z.boolean(),
  expectedVersion: z.number().int().min(0),
  approvalConfirmed: z.boolean().default(false),
  approvalReference: z.string().trim().max(500).default(""),
}).strict();

export async function setMcpBusinessAccess(input: z.input<typeof changeSchema>) {
  const admin = await requireSuperAdminSession();
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) return { error: "Solicitud inválida." };
  const data = parsed.data;
  if (data.enabled) {
    if (!mcpEnabled()) return { error: "Prepara el servidor de la integración antes de habilitar los negocios." };
    if (!data.approvalConfirmed || data.approvalReference.length < 3) return { error: "Registra la aprobación de OpenAI antes de habilitar los negocios." };
    if (!isRecentAdminAuth(admin)) return stepUpRequiredResult();
  }
  const result = await prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(88000221)`;
    const previous = await db.mcpRolloutState.findUnique({ where: { id: MCP_ROLLOUT_ID } });
    if ((previous?.version ?? 0) !== data.expectedVersion) return { error: "El estado cambió. Actualiza la página antes de continuar." };
    if ((previous?.businessAccessEnabled ?? false) === data.enabled) return { success: true };
    const update = {
      businessAccessEnabled: data.enabled,
      version: data.expectedVersion + 1,
      ...(data.enabled ? { approvedAt: new Date(), approvalReference: data.approvalReference } : {}),
    };
    await db.mcpRolloutState.upsert({ where: { id: MCP_ROLLOUT_ID }, create: { id: MCP_ROLLOUT_ID, ...update }, update });
    await db.auditLog.create({ data: { userId: admin.id, action: data.enabled ? "MCP_BUSINESS_ACCESS_ENABLED" : "MCP_BUSINESS_ACCESS_PAUSED",
      details: JSON.stringify({ previousEnabled: previous?.businessAccessEnabled ?? false, enabled: data.enabled, version: update.version, ...(data.enabled ? { approvalReference: data.approvalReference } : {}) }) } });
    return { success: true };
  });
  if (result.success) {
    revalidatePath(`${ADMIN_SECRET_PATH}/integrations`);
    revalidatePath("/dashboard/settings");
    revalidatePath("/integraciones/chatgpt/conexiones");
  }
  return result;
}
