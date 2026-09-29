import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { createPuriContext } from "@/server/puri/context";
import { answerWithPuri } from "@/server/puri/orchestrator";
import { checkPuriRateLimit } from "@/server/puri/rate-limit";
import { PuriAccessError } from "@/server/puri/types";
import { getLocale } from "next-intl/server";
import { prisma } from "@/server/db/prisma";
import { requireSameOrigin } from "@/server/security/same-origin";
import { PURI_MODEL } from "@/server/puri/openai-client";
import { emptyPuriTelemetry, estimatePuriCostUsd, intentFromTools, requestStatus } from "@/server/puri/telemetry";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  sessionId: z.string().uuid().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2_000) })).max(12).default([]),
  context: z.object({
    pathname: z.string().max(200).default("/dashboard"),
    locationSlug: z.string().max(100).optional(),
    agenda: z.enum(["mine", "all"]).optional(),
    period: z.enum(["week", "month"]).optional(),
    locale: z.string().max(12).default("es"),
  }).default({ pathname: "/dashboard", locale: "es" }),
});

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  const started = performance.now();
  const sessionId = parsed.data.sessionId ?? crypto.randomUUID();
  try {
    const context = await createPuriContext(user, { ...parsed.data.context, locale: await getLocale() });
    const limit = await checkPuriRateLimit(context.business.id + ":" + user.id);
    if (!limit.allowed) return Response.json({ code: "RATE_LIMIT", retryAfter: limit.retryAfter }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const telemetry = emptyPuriTelemetry(PURI_MODEL);
    let answer;
    let errorCode: string | undefined;
    try {
      answer = await answerWithPuri({ context, message: parsed.data.message, history: parsed.data.history, telemetry });
    } catch (error) {
      errorCode = error instanceof Error && error.message === "PURI_NOT_CONFIGURED" ? "NOT_CONFIGURED"
        : error instanceof Error && ["APIConnectionTimeoutError", "TimeoutError", "AbortError"].includes(error.name) ? "MODEL_TIMEOUT"
        : "MODEL_OR_PROVIDER_ERROR";
    }
    const status = errorCode ? errorCode === "MODEL_TIMEOUT" ? "TIMEOUT" : "ERROR" : requestStatus(telemetry.toolCalls);
    const intent = intentFromTools(telemetry.toolCalls, parsed.data.message);
    let responseId: string | undefined;
    try {
      const record = await prisma.puriRequest.create({ data: {
        sessionId, businessId: context.business.id, businessLocationId: context.location?.id,
        userId: user.id, role: user.role, model: telemetry.model, intent, status,
        errorCode: errorCode ?? telemetry.toolCalls.find((call) => call.errorCode)?.errorCode,
        totalDurationMs: Math.round(performance.now() - started), modelDurationMs: telemetry.modelDurationMs || null,
        toolsDurationMs: telemetry.toolCalls.length ? telemetry.toolsDurationMs : null, promptTokens: telemetry.promptTokens,
        completionTokens: telemetry.completionTokens, cachedTokens: telemetry.cachedTokens,
        estimatedCostUsd: estimatePuriCostUsd(telemetry), completedAt: new Date(),
        toolCalls: { create: telemetry.toolCalls.map((call) => ({
          businessId: context.business.id, userId: user.id, toolName: call.toolName,
          status: call.status, errorCode: call.errorCode, resultCount: call.resultCount,
          durationMs: call.durationMs,
        })) },
      }, select: { id: true } });
      responseId = record.id;
    } catch { console.error("[puri] telemetry write failed"); }
    if (errorCode) return Response.json({ code: errorCode === "NOT_CONFIGURED" ? "NOT_CONFIGURED" : "UNAVAILABLE" }, { status: 503 });
    return Response.json({ answer, responseId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PuriAccessError) {
      try {
        const business = await prisma.business.findFirst({ where: { OR: [{ ownerId: user.id }, { staff: { some: { userId: user.id, isActive: true } } }] }, select: { id: true } });
        if (business) await prisma.puriUiEvent.create({ data: { event: "permission_denied", sessionId,
          businessId: business.id, userId: user.id, role: user.role, errorCode: error.code } });
      } catch { console.error("[puri] permission telemetry write failed"); }
      const status = error.code === "BUSINESS_NOT_FOUND" ? 404 : error.code === "FORBIDDEN" || error.code === "LOCATION_FORBIDDEN" ? 403 : 400;
      return Response.json({ code: "FORBIDDEN" }, { status });
    }
    if (error instanceof Error && error.message === "PURI_NOT_CONFIGURED") {
      return Response.json({ code: "NOT_CONFIGURED" }, { status: 503 });
    }
    console.error("[puri] request failed");
    return Response.json({ code: "UNAVAILABLE" }, { status: 503 });
  }
}
