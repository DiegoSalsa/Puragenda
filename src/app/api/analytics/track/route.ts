import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { analyticsDistributedLimiter } from "@/server/lib/distributed-rate-limit";
import { isTrackingEvent, sanitizeTrackingProperties } from "@/lib/analytics/events";
import { ANALYTICS_POLICY_VERSION } from "@/lib/analytics/policy";
import { normalizeTrackingPath } from "@/lib/analytics/path";
import { requireSameOrigin } from "@/server/security/same-origin";
import { hashPrivacyEmail } from "@/lib/privacy/identity";

const pseudonymousId = z.string().regex(/^[A-Za-z0-9._-]{16,128}$/);
const safeString = z.string().trim().min(1).max(160).optional();
const payloadSchema = z.object({
  event: z.string().min(1).max(80),
  visitorId: pseudonymousId,
  sessionId: pseudonymousId,
  path: z.string().startsWith("/").max(240),
  referrerDomain: z.string().max(255).optional(),
  utmSource: safeString,
  utmMedium: safeString,
  utmCampaign: safeString,
  businessSlug: z.string().trim().min(1).max(120).optional(),
  consentVersion: z.literal(ANALYTICS_POLICY_VERSION),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
}).strict();

function safeDomain(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(`https://${value}`).hostname.slice(0, 255);
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const limited = await analyticsDistributedLimiter.check(request);
  if (limited) return limited;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  try {
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Evento de analítica inválido" }, { status: 400 });
    }
    const data = parsed.data;
    if (!isTrackingEvent(data.event)) {
      return NextResponse.json({ error: "Evento de analítica inválido" }, { status: 400 });
    }
    const event = data.event;
    const sessionUser = await getApiSessionUser(request);
    const consent = await prisma.trackingConsent.findFirst({
      where: {
        visitorId: data.visitorId,
        policyVersion: ANALYTICS_POLICY_VERSION,
      },
      orderBy: { occurredAt: "desc" },
      select: { decision: true, occurredAt: true },
    });
    if (consent?.decision !== "accepted") {
      return NextResponse.json({ error: "No existe consentimiento vigente" }, { status: 403 });
    }
    const blockingRequest = await prisma.privacyRequest.findFirst({
      where: {
        requestType: "BLOCKING",
        status: { in: ["RECEIVED", "IN_REVIEW"] },
        OR: [
          { visitorId: data.visitorId },
          ...(sessionUser?.id ? [{ userId: sessionUser.id }] : []),
        ],
      },
      select: { id: true },
    });
    const restriction = await prisma.privacyRestriction.findFirst({
      where: {
        active: true,
        OR: [
          { visitorId: data.visitorId },
          ...(sessionUser?.id ? [{ userId: sessionUser.id }] : []),
          ...(sessionUser?.email ? [{ emailHash: hashPrivacyEmail(sessionUser.email) }] : []),
        ],
      },
      select: { id: true },
    });
    if (blockingRequest || restriction) {
      return NextResponse.json({ ok: true, blocked: true }, { status: 202 });
    }
    const business = data.businessSlug
      ? await prisma.business.findUnique({ where: { slug: data.businessSlug }, select: { id: true } })
      : sessionUser
        ? await prisma.business.findFirst({
            where: {
              OR: [
                { ownerId: sessionUser.id },
                { staff: { some: { userId: sessionUser.id } } },
              ],
            },
            select: { id: true },
          })
        : null;
    await prisma.trackingEvent.create({
      data: {
        event,
        visitorId: data.visitorId,
        sessionId: data.sessionId,
        userId: sessionUser?.id,
        businessId: business?.id,
        path: normalizeTrackingPath(data.path),
        referrerDomain: safeDomain(data.referrerDomain),
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        properties: sanitizeTrackingProperties(event, data.properties),
        consentVersion: data.consentVersion,
        consentGrantedAt: consent.occurredAt,
      },
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("[analytics] could not store tracking event", error);
    return NextResponse.json({ error: "No se pudo registrar el evento" }, { status: 500 });
  }
}
