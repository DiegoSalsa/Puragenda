import { prisma } from "@/server/db/prisma";
import { growthFixture, deleteGrowthFixture } from "./puri-growth";
import { analyzeGrowth } from "@/server/puri/growth/analysis";
import {
  draftGrowthRecommendation,
  prepareGrowthStrategy,
  transitionGrowthRecommendation,
} from "@/server/puri/growth/recommendations";
import { configureContactPolicy } from "@/server/contact-flow/quotas";
import { recordConsent } from "@/server/contact-flow/consent";
import { digest } from "@/server/contact-flow/policy";
import {
  prepareCampaign,
  authorizeCampaign,
} from "@/server/contact-flow/campaigns";

export const syntheticContactPolicy = {
  dailyLimit: 100,
  monthlyLimit: 1000,
  contactDays: 7,
  senderEmail: "commercial-lab@example.invalid",
  killed: false,
  emailEnabled: true,
};
export async function contactFixture(
  options: {
    trial?: boolean;
    consents?: number;
    authorize?: boolean;
    prepare?: boolean;
    maximum?: number;
  } = {},
) {
  const f = await growthFixture({ trial: options.trial });
  await configureContactPolicy("GLOBAL", {
    ...syntheticContactPolicy,
    dailyLimit: 100000,
    monthlyLimit: 1000000,
  });
  await configureContactPolicy(f.businessId, syntheticContactPolicy);
  const clients = await prisma.client.findMany({
    where: { businessId: f.businessId },
    orderBy: { id: "asc" },
  });
  for (const c of clients.slice(0, options.consents ?? 6))
    await recordConsent(f.scope, {
      clientId: c.id,
      source: "SYNTHETIC_FORM",
      accepted: true,
      textVersion: "cf-commercial-email-v1",
      evidenceRef: `synthetic:${c.id}`,
      evidenceHash: digest(`synthetic-accepted:${c.id}`),
      grantedAt: new Date(Date.now() - 60000).toISOString(),
    });
  const a = await analyzeGrowth(f.scope),
    signal = a.signals.find((s) => s.kind === "INACTIVE_CLIENTS")!;
  let rec = await draftGrowthRecommendation(f.scope, signal.id);
  rec = await prepareGrowthStrategy(
    f.scope,
    rec.id,
    rec.contentHash,
    rec.version,
  );
  rec = await transitionGrowthRecommendation(f.scope, {
    id: rec.id,
    hash: rec.contentHash,
    version: rec.version,
    action: "REVIEW",
  });
  rec = await transitionGrowthRecommendation(f.scope, {
    id: rec.id,
    hash: rec.contentHash,
    version: rec.version,
    action: "APPROVE",
    explicit: true,
  });
  const input = {
    recommendationId: rec.id,
    recommendationHash: rec.contentHash,
    recommendationVersion: rec.version,
    serviceId: f.service.id,
    startsAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    maxContacts: options.maximum ?? 5,
    dailyLimit: options.maximum ?? 5,
  };
  let campaignId: string | null = null;
  if (options.prepare !== false) {
    const c = await prepareCampaign(f.scope, input);
    campaignId = c.id;
    if (options.authorize !== false) {
      const v = await prisma.cfVersion.findFirstOrThrow({
        where: { campaignId: c.id },
      });
      await authorizeCampaign(f.scope, c.id, v.contentHash, v.version, true);
    }
  }
  return { ...f, clients, rec, input, campaignId };
}
export async function deleteContactFixture(
  f: Awaited<ReturnType<typeof contactFixture>>,
) {
  await prisma.cfAttribution.deleteMany({
    where: { businessId: f.businessId },
  });
  await prisma.cfCampaign.deleteMany({ where: { businessId: f.businessId } });
  await prisma.cfConsent.deleteMany({ where: { businessId: f.businessId } });
  await prisma.cfSuppression.deleteMany({
    where: { businessId: f.businessId },
  });
  await deleteGrowthFixture(f);
}
