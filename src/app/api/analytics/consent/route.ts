import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { consentDistributedLimiter } from "@/server/lib/distributed-rate-limit";
import { ANALYTICS_POLICY_VERSION } from "@/lib/analytics/policy";
import { requireSameOrigin } from "@/server/security/same-origin";

const payloadSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
  policyVersion: z.literal(ANALYTICS_POLICY_VERSION),
  visitorId: z.string().regex(/^[A-Za-z0-9._-]{16,128}$/).optional(),
  sessionId: z.string().regex(/^[A-Za-z0-9._-]{16,128}$/).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const limited = await consentDistributedLimiter.check(request);
  if (limited) return limited;

  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Consentimiento inválido" }, { status: 400 });
    const user = await getApiSessionUser(request);
    const consent = await prisma.trackingConsent.create({
      data: {
        decision: parsed.data.decision,
        policyVersion: parsed.data.policyVersion,
        visitorId: parsed.data.visitorId,
        sessionId: parsed.data.sessionId,
        userId: user?.id,
      },
      select: { occurredAt: true },
    });
    return NextResponse.json({ ok: true, occurredAt: consent.occurredAt.toISOString() }, { status: 202 });
  } catch (error) {
    console.error("[analytics/consent] could not store consent", error);
    return NextResponse.json({ error: "No se pudo registrar el consentimiento" }, { status: 500 });
  }
}
