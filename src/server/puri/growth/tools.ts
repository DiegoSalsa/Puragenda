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

export const GROWTH_TOOL_POLICY = {
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
): NonNullable<PuriCapabilityExtension["tools"]> {
  return Object.entries(GROWTH_TOOL_POLICY)
    .filter(
      ([name]) =>
        (name !== "get_service_performance" || scope.canMoney) &&
        (name !== "get_inactive_client_cohort" || scope.canClients) &&
        (name !== "prepare_contact_flow" || scope.canPrepare),
    )
    .map(([name, policy]) => ({
      type: "function",
      name,
      description: `${policy.mode}: ${policy.returns}. ${policy.permission}. No sending, approval or execution.`,
      strict: true,
      parameters:
        name === "prepare_contact_flow"
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
