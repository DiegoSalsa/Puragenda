import { z } from "zod";
import type { PuriCapabilityExtension } from "../orchestrator";
import { PuriAccessError } from "../types";
import { revalidateGrowthScope, type GrowthScope } from "./access";
import { analyzeGrowth } from "./analysis";
import {
  listGrowthRecommendations,
  prepareGrowthStrategy,
} from "./recommendations";
import type { GrowthEvidence } from "./evidence";
import { contactLabEnabled } from "@/server/contact-flow/policy";
import {
  contactSnapshot,
  prepareCampaign,
} from "@/server/contact-flow/campaigns";
import { contactResults } from "@/server/contact-flow/metrics";

export const GROWTH_TOOL_POLICY = {
  get_contact_campaigns: {
    tier: "PURI_PLUS",
    permission: "CLIENTS_AND_MARKETING_MANAGE",
    mode: "READ",
    budget: "CACHE",
    returns:
      "Campaign counts, exclusions and version hashes; no recipient identities",
  },
  get_contact_quotas: {
    tier: "PURI_PLUS",
    permission: "CLIENTS_AND_MARKETING_MANAGE",
    mode: "READ",
    budget: "CACHE",
    returns: "Configured synthetic quotas and server execution blocks",
  },
  get_contact_results: {
    tier: "PURI_PLUS",
    permission: "CLIENTS_AND_MARKETING_MANAGE",
    mode: "READ",
    budget: "CACHE",
    returns: "Verified technical attribution; never incremental causation",
  },
  prepare_contact_campaign: {
    tier: "PURI_PLUS_PREPARE",
    permission: "CLIENTS_AND_MARKETING_MANAGE",
    mode: "PREPARE",
    budget: "ANALYSIS_SQL",
    returns:
      "Campaign from an approved proposal, with deterministic server defaults; never authorizes or sends",
  },
  get_growth_signals: {
    tier: "PURI_PLUS",
    permission: "APPOINTMENTS_VIEW_SCOPED",
    mode: "READ",
    budget: "ANALYSIS_SQL_CACHE",
    returns: "Aggregate signals, trends, occupancy, retention; no recipients",
  },
  get_service_performance: {
    tier: "PURI_PLUS",
    permission: "ANALYTICS_VIEW_SCOPED",
    mode: "READ",
    budget: "ANALYSIS_SQL_CACHE",
    returns: "Service counts, recorded collections, nominal values",
  },
  get_inactive_client_cohort: {
    tier: "PURI_PLUS",
    permission: "CLIENTS_MANAGE",
    mode: "READ",
    budget: "ANALYSIS_SQL_CACHE",
    returns: "Count and cadence rules; never a consent or recipient list",
  },
  get_growth_recommendations: {
    tier: "PURI_PLUS",
    permission: "APPOINTMENTS_VIEW_SCOPED",
    mode: "READ",
    budget: "CACHE",
    returns: "Scoped immutable recommendation summaries",
  },
  prepare_contact_flow: {
    tier: "PURI_PLUS_PREPARE",
    permission: "OWNER_OR_MARKETING_MANAGE",
    mode: "PREPARE",
    budget: "NO_MODEL_COST_IN_TOOL",
    returns: "Non-executable structured proposal",
  },
} as const;
const empty = z.object({}).strict();
const prepare = z
  .object({
    recommendationId: z.string().min(1).max(100),
    contentHash: z.string().length(64),
    version: z.number().int().positive(),
  })
  .strict();
export function growthToolDefinitions(
  scope: GrowthScope,
  allowPrepare = scope.canPrepare,
): NonNullable<PuriCapabilityExtension["tools"]> {
  return Object.entries(GROWTH_TOOL_POLICY)
    .filter(
      ([name]) =>
        ((!name.startsWith("get_contact_") &&
          name !== "prepare_contact_campaign") ||
          (contactLabEnabled() && scope.canClients && scope.canPrepare)) &&
        (name !== "prepare_contact_campaign" || allowPrepare) &&
        (name !== "get_service_performance" || scope.canMoney) &&
        (name !== "get_inactive_client_cohort" || scope.canClients) &&
        (name !== "prepare_contact_flow" || allowPrepare),
    )
    .map(([name, policy]) => ({
      type: "function",
      name,
      description: `${policy.mode}: ${policy.returns}. ${policy.permission}. No sending, approval or execution.`,
      strict: true,
      parameters:
        name === "prepare_contact_flow" || name === "prepare_contact_campaign"
          ? {
              type: "object",
              properties: {
                recommendationId: { type: "string" },
                contentHash: { type: "string" },
                version: { type: "integer" },
              },
              required: ["recommendationId", "contentHash", "version"],
              additionalProperties: false,
            }
          : name === "get_contact_results"
            ? {
                type: "object",
                properties: { campaignId: { type: "string" } },
                required: ["campaignId"],
                additionalProperties: false,
              }
            : {
                type: "object",
                properties: {},
                required: [],
                additionalProperties: false,
              },
    }));
}
export async function executeGrowthTool(
  name: string,
  args: unknown,
  scope: GrowthScope,
) {
  await revalidateGrowthScope(scope);
  if (
    !growthToolDefinitions(scope).some(
      (t) => t.type === "function" && t.name === name,
    )
  )
    throw new PuriAccessError("UNKNOWN_TOOL");
  if (name === "prepare_contact_flow") {
    const a = prepare.parse(args);
    const r = await prepareGrowthStrategy(
      scope,
      a.recommendationId,
      a.contentHash,
      a.version,
    );
    return {
      id: r.id,
      version: r.version,
      contentHash: r.contentHash,
      status: r.status,
      strategy: r.strategy,
      executable: false,
    };
  }
  if (name === "prepare_contact_campaign") {
    const a = prepare.parse(args),
      snapshot = await contactSnapshot(scope);
    if (snapshot.services.length !== 1)
      throw new Error("EXPLICIT_SERVICE_SELECTION_REQUIRED");
    const rec = (await listGrowthRecommendations(scope)).find(
      (r) => r.id === a.recommendationId && r.status === "APPROVED",
    );
    if (!rec) throw new Error("APPROVED_PROPOSAL_REQUIRED");
    const now = new Date();
    const campaign = await prepareCampaign(scope, {
      recommendationId: a.recommendationId,
      recommendationHash: a.contentHash,
      recommendationVersion: a.version,
      serviceId: snapshot.services[0].id,
      startsAt: now.toISOString(),
      expiresAt: new Date(
        Math.min(+rec.expiresAt, +now + 6 * 86400000),
      ).toISOString(),
      maxContacts: 50,
      dailyLimit: 5,
    });
    return {
      campaignId: campaign.id,
      status: campaign.status,
      authorizationRequired: true,
      externalBlocked: true,
    };
  }
  if (name === "get_contact_results")
    return contactResults(
      scope,
      z
        .object({ campaignId: z.string().min(1).max(100) })
        .strict()
        .parse(args).campaignId,
    );
  if (name === "get_contact_campaigns" || name === "get_contact_quotas") {
    empty.parse(args);
    const s = await contactSnapshot(scope);
    return name === "get_contact_quotas"
      ? {
          policy: s.policy,
          global: s.global,
          quotas: s.quotas,
          externalBlocked: true,
        }
      : {
          campaigns: s.campaigns.map((c) => ({
            id: c.id,
            status: c.status,
            version: c.version.version,
            hash: c.version.contentHash,
            objective: c.version.objective,
            eligible: c.eligible,
            excluded: c.excluded,
            exclusions: c.exclusions,
            states: c.states,
            body: c.version.body,
          })),
          mode: "SIMULATED_ONLY",
          externalBlocked: true,
        };
  }
  empty.parse(args);
  if (name === "get_growth_recommendations")
    return {
      recommendations: (await listGrowthRecommendations(scope)).map((r) => ({
        id: r.id,
        title: r.title,
        explanation: r.explanation,
        status: r.status,
        version: r.version,
        contentHash: r.contentHash,
        expiresAt: r.expiresAt,
        executable: false,
      })),
    };
  const result = await analyzeGrowth(scope),
    e = result.run.evidence as unknown as GrowthEvidence;
  if (!e) return { verified: false, error: "ANALYSIS_IN_PROGRESS" };
  if (name === "get_service_performance")
    return { period: e.period, services: e.services, money: e.money ?? null };
  if (name === "get_inactive_client_cohort")
    return {
      period: e.period,
      cohort: e.cohort ?? null,
      consent: "NOT_VERIFIED",
      rules: e.rules,
    };
  return {
    period: e.period,
    counts: e.counts,
    occupancy: e.occupancy,
    ...(scope.canClients ? { retention: e.retention, cohort: e.cohort } : {}),
    signals: result.signals.map((s) => ({
      kind: s.kind,
      priority: s.priority,
      confidence: s.confidence,
      evidence: s.evidence,
    })),
    cached: result.cached,
  };
}
