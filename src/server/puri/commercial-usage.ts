import { randomUUID } from "node:crypto";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { commercialHash } from "@/server/services/commercial-internal";
import { GrowthBudgetError, maximumModelMicros, knownModelMicros, reserveGrowthUsage, settleGrowthUsage } from "./growth/budgets";
import { PuriAccessError } from "./types";

type ModelResult = { model?: string; service_tier?: string | null; usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number } } };
/** Standard Puri shares the same trial/paid buckets as advanced Puri. The
 * transport stays with the existing orchestrator; this layer never invokes it
 * before verifying the grant and reserving the configured allowance. */
export async function withCommercialPuriUsage<T extends ModelResult>(input: {
  businessId: string; model: string; parameters: unknown; maxRetries: number; run: () => Promise<T>;
}) {
  const access = await getCommercialPlanAccess(input.businessId);
  if (!access.has("puri.standard")) throw new PuriAccessError("FORBIDDEN");
  const bytes = Buffer.byteLength(JSON.stringify(input.parameters));
  const perAttempt = maximumModelMicros(input.model, bytes);
  const micros = perAttempt === null ? null : perAttempt * (1 + input.maxRetries);
  if (micros === null || !Number.isSafeInteger(micros) || micros < 1) throw new GrowthBudgetError("MODEL_PRICE_UNKNOWN");
  let reservation;
  try {
    reservation = await reserveGrowthUsage({ businessId: input.businessId, category: "STANDARD_INTERACTIVE", key: `standard:${randomUUID()}`, inputHash: commercialHash(input.parameters), micros });
  } catch (error) {
    if (error instanceof Error && error.message === "COMMERCIAL_USAGE_LIMITS_UNDEFINED") throw new GrowthBudgetError(error.message);
    throw error;
  }
  try {
    const response = await input.run();
    await settleGrowthUsage(reservation.reservation.id, { actualMicros: response.service_tier === "default" ? knownModelMicros(response.model ?? input.model, response.usage) : null, model: response.model ?? input.model, usage: response.usage });
    return response;
  } catch (error) {
    await settleGrowthUsage(reservation.reservation.id, { actualMicros: null, model: input.model, errorCode: "MODEL_OUTCOME_UNKNOWN" });
    throw error;
  }
}
