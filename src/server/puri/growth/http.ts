import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { requireSameOrigin } from "@/server/security/same-origin";
import { createPuriContext } from "@/server/puri/context";
import { checkPuriRateLimit } from "@/server/puri/rate-limit";
import {
  createGrowthScope,
  growthSandboxEnabled,
} from "@/server/puri/growth/access";
import {
  analyzeGrowth,
  expireGrowthRecords,
  listGrowthSignals,
} from "@/server/puri/growth/analysis";
import {
  draftGrowthRecommendation,
  prepareGrowthStrategy,
  listGrowthRecommendations,
  transitionGrowthRecommendation,
} from "@/server/puri/growth/recommendations";
import { answerWithGrowthPuri } from "@/server/puri/growth/runtime";
import {
  growthBudgetSnapshot,
  growthUsageSummary,
  GrowthBudgetError,
} from "@/server/puri/growth/budgets";
import { growthPlatformMetrics } from "@/server/puri/growth/monitoring";
import { PuriAccessError } from "@/server/puri/types";
import { getApiAdminSessionUser } from "@/server/auth/admin-session";
import { readContactText } from "@/server/contact-flow/http";

const schema = z
  .object({
    action: z.enum([
      "LOAD",
      "ANALYZE",
      "DRAFT",
      "PREPARE",
      "VIEW",
      "REVIEW",
      "APPROVE",
      "REJECT",
      "CHAT",
      "EXPLAIN",
      "MONITOR",
    ]),
    locationSlug: z.string().max(100).optional(),
    allLocations: z.boolean().default(false),
    id: z.string().min(1).max(100).optional(),
    hash: z.string().length(64).optional(),
    version: z.number().int().positive().optional(),
    explicit: z.boolean().optional(),
    message: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();
export async function POST(request: NextRequest) {
  if (!growthSandboxEnabled())
    return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  const origin = requireSameOrigin(request);
  if (origin) return origin;
  const parsed = schema.safeParse(await readContactText(request).then(JSON.parse).catch(() => null));
  if (!parsed.success)
    return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const a = parsed.data;
    if (a.action === "MONITOR") {
      const admin = await getApiAdminSessionUser(request);
      if (!admin)
        return Response.json({ code: "SUPERADMIN_REQUIRED" }, { status: 403 });
      return Response.json(await growthPlatformMetrics(admin.id), {
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    const user = await getApiSessionUser(request);
    if (!user)
      return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
    const context = await createPuriContext(user, {
      pathname: "/dashboard/puri-plus",
      locationSlug: a.locationSlug,
      locale: "es",
    });
    const scope = await createGrowthScope(context, a.allLocations);
    const limit = await checkPuriRateLimit(
      scope.businessId + ":" + scope.actorId,
    );
    if (!limit.allowed)
      return Response.json(
        { code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    let result: unknown;
    if (a.action === "ANALYZE") result = await analyzeGrowth(scope);
    else if (a.action === "DRAFT") {
      if (!a.id) throw new Error("INVALID_REQUEST");
      result = await draftGrowthRecommendation(scope, a.id);
    } else if (a.action === "PREPARE") {
      if (!a.id || !a.hash || !a.version) throw new Error("INVALID_REQUEST");
      result = await prepareGrowthStrategy(scope, a.id, a.hash, a.version);
    } else if (["VIEW", "REVIEW", "APPROVE", "REJECT"].includes(a.action)) {
      if (!a.id || !a.hash || !a.version) throw new Error("INVALID_REQUEST");
      result = await transitionGrowthRecommendation(scope, {
        id: a.id,
        hash: a.hash,
        version: a.version,
        action: a.action as "VIEW" | "REVIEW" | "APPROVE" | "REJECT",
        explicit: a.explicit,
      });
    } else if (a.action === "CHAT" || a.action === "EXPLAIN") {
      if (!a.message) throw new Error("INVALID_REQUEST");
      if (a.action === "EXPLAIN" && !a.id) throw new Error("INVALID_REQUEST");
      result = await answerWithGrowthPuri(context, scope, a.message, {
        recommendationId: a.action === "EXPLAIN" ? a.id : undefined,
      });
    }
    await expireGrowthRecords(scope);
    const dashboard = request.nextUrl.pathname.startsWith("/api/dashboard/");
    if (dashboard && result && typeof result === "object" && "costMicros" in result) {
      const publicResult = { ...result } as Record<string, unknown>;
      delete publicResult.costMicros; delete publicResult.costKnown; delete publicResult.errorCode;
      result = publicResult;
    }
    return Response.json(
      {
        result,
        signals: await listGrowthSignals(scope),
        recommendations: (await listGrowthRecommendations(scope)).map(row => dashboard ? { id: row.id, title: row.title, explanation: row.explanation, status: row.status, version: row.version, contentHash: row.contentHash, strategy: row.strategy, expiresAt: row.expiresAt, evidence: row.evidence } : row),
        ...(request.nextUrl.pathname.startsWith("/api/dashboard/") ? {} : { budgets: await growthBudgetSnapshot(scope), usage: await growthUsageSummary(scope) }),
        capabilities: {
          tier: scope.canPrepare ? "PURI_PLUS_PREPARE" : "PURI_PLUS",
          canMoney: scope.canMoney,
          canClients: scope.canClients,
          canPrepare: scope.canPrepare,
        },
        scope: {
          location: context.location?.name ?? "Todas las sucursales",
          timezone: scope.timezone,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const code =
      error instanceof PuriAccessError
        ? error.code
        : error instanceof Error && /^[A-Z_]+$/.test(error.message)
          ? error.message
          : "UNAVAILABLE";
    const status =
      error instanceof GrowthBudgetError
        ? 429
        : code === "UNAVAILABLE"
          ? 503
          : code.includes("FORBIDDEN") || code.includes("REQUIRED")
            ? 403
            : 409;
    return Response.json(
      { code },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
