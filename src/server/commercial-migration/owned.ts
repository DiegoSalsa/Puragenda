import { z } from "zod";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { prepareCommercialMigration, approveCommercialMigration, getCommercialMigrationStatus, assertMigrationSandbox } from "./service";
import type { MigrationPreview } from "./preview";

async function ownerContext() {
  assertMigrationSandbox();
  const user = await getCurrentSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt || business.ownerId !== user.id) throw new Error("OWNER_REQUIRED");
  return { actorId: user.id, businessId: business.id };
}
const prepareSchema = z.object({ plan: z.enum(["PURAGENDA", "PURAGENDA_PLUS"]), professionalTotal: z.number().int().positive().max(100_000),
  effectiveAt: z.string().datetime({ offset: true }), idempotencyKey: z.string().regex(/^[\w:.-]{8,200}$/) }).strict();
const approvalSchema = z.object({ id: z.string().min(1), previewHash: z.string().regex(/^[a-f0-9]{64}$/), confirmed: z.literal(true) }).strict();

/** Session-derived tenant and strict allowlists: browser cannot provide price,
 * provider proof, actor, source state, fixture policies or an APPLIED status. */
export async function prepareOwnedCommercialMigration(input: unknown) {
  const owner = await ownerContext();
  const data = prepareSchema.parse(input);
  const result = await prepareCommercialMigration({ ...owner, ...data, effectiveAt: new Date(data.effectiveAt) });
  return { id: result.id, status: result.status, previewHash: result.previewHash };
}
export async function approveOwnedCommercialMigration(input: unknown) {
  const owner = await ownerContext();
  const data = approvalSchema.parse(input);
  const result = await approveCommercialMigration(owner.businessId, owner.actorId, data.id, data.previewHash, data.confirmed);
  return { id: result.id, status: result.status, reason: result.reason };
}
export async function readOwnedCommercialMigration(id: string) {
  const owner = await ownerContext();
  const proposal = await prisma.commercialMigrationProposal.findFirstOrThrow({ where: { id, businessId: owner.businessId } });
  const preview = proposal.preview as unknown as MigrationPreview;
  const { provider, ...safePreview } = preview;
  return { ...await getCommercialMigrationStatus(owner.businessId, id), preview: { ...safePreview,
    provider: { code: provider.code, preview: provider.preview } } };
}
