import { NextRequest } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { requireSameOrigin } from "@/server/security/same-origin";

const schema = z.object({ responseId: z.string().min(1).max(40), rating: z.enum(["positive", "negative"]), reason: z.enum(["incorrect", "misunderstood", "wrong_information", "missing_information", "slow", "unsupported", "other"]).optional() }).strict();

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const user = await getApiSessionUser(request);
  if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ code: "INVALID_REQUEST" }, { status: 400 });
  const puriRequest = await prisma.puriRequest.findFirst({ where: { id: parsed.data.responseId, userId: user.id }, select: { id: true, businessId: true } });
  if (!puriRequest) return Response.json({ code: "NOT_FOUND" }, { status: 404 });
  await prisma.puriFeedback.upsert({ where: { requestId: puriRequest.id }, create: {
    requestId: puriRequest.id, businessId: puriRequest.businessId, userId: user.id,
    rating: parsed.data.rating, reason: parsed.data.rating === "negative" ? parsed.data.reason : null,
  }, update: { rating: parsed.data.rating, reason: parsed.data.rating === "negative" ? parsed.data.reason : null } });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
