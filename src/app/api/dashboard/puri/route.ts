import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { createPuriContext } from "@/server/puri/context";
import { answerWithPuri } from "@/server/puri/orchestrator";
import { checkPuriRateLimit } from "@/server/puri/rate-limit";
import { PuriAccessError } from "@/server/puri/types";
import { getLocale } from "next-intl/server";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
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
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const context = await createPuriContext(user, { ...parsed.data.context, locale: await getLocale() });
    const limit = await checkPuriRateLimit(context.business.id + ":" + user.id);
    if (!limit.allowed) return Response.json({ code: "RATE_LIMIT", retryAfter: limit.retryAfter }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    const answer = await answerWithPuri({ context, message: parsed.data.message, history: parsed.data.history });
    return Response.json({ answer }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof PuriAccessError) {
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
