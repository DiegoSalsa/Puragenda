import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { allowedTutorials } from "@/core/tutorials";
import { canManageSetup } from "@/core/onboarding";
import { SetupError } from "./service";

export async function learningContext(user: { id: string; role: string }) {
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt) throw new SetupError("Negocio no encontrado.", 404);
  const [permissions, access] = await Promise.all([getEffectiveBusinessPermissions(user, business), getCommercialPlanAccess(business.id)]);
  const capabilities = access.has("website.editor") ? ["website.editor"] : [];
  return { businessId: business.id, userId: user.id, canSetup: canManageSetup(permissions), tutorials: allowedTutorials(permissions, capabilities) };
}
export const learningRequestSchema = z.object({ tutorialId: z.string().max(60), version: z.number().int().positive(), step: z.number().int().min(0), revision: z.number().int().min(0), status: z.enum(["active", "paused", "completed"]), reset: z.boolean().default(false) });
export async function saveLearning(context: Awaited<ReturnType<typeof learningContext>>, raw: unknown) {
  const value = learningRequestSchema.safeParse(raw);
  if (!value.success) throw new SetupError("Progreso inválido.");
  const input = value.data;
  const tutorial = context.tutorials.find(t => t.id === input.tutorialId && t.version === input.version);
  if (!tutorial) throw new SetupError("Esta guía no está disponible con tus permisos y plan.", 403);
  if (input.step >= tutorial.steps.length || (input.status === "completed" && input.step !== tutorial.steps.length - 1)) throw new SetupError("Paso inválido.");
  const { businessId, userId } = context;
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`learning:${businessId}:${userId}:${tutorial.id}`}, 0))::text`;
    const key = { businessId, userId, tutorialId: tutorial.id, version: tutorial.version };
    const existing = await tx.tutorialProgress.findUnique({ where: { businessId_userId_tutorialId_version: key } });
    if (existing && (existing.revision !== input.revision || (existing.status === "completed" && !input.reset && input.status !== "completed"))) throw new SetupError("La guía cambió en otra pestaña. Vuelve a abrirla.", 409);
    return tx.tutorialProgress.upsert({ where: { businessId_userId_tutorialId_version: key }, create: { ...key, step: input.reset ? 0 : input.step, status: input.status, revision: 1 }, update: { step: input.reset ? 0 : input.step, status: input.status, revision: { increment: 1 } } });
  });
}
