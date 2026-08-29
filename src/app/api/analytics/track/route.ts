import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { trackingLimiter } from "@/server/lib/rate-limit";
import { isTrackingEvent, sanitizeTrackingProperties } from "@/lib/analytics/events";

const safeString = z.string().trim().min(1).max(160).optional();
const payloadSchema = z.object({
  event: z.string().min(1).max(80),
  visitorId: z.string().min(16).max(128),
  sessionId: z.string().min(16).max(128),
  path: z.string().startsWith("/").max(240),
  referrerDomain: z.string().max(255).optional(),
  utmSource: safeString,
  utmMedium: safeString,
  utmCampaign: safeString,
  businessSlug: z.string().trim().min(1).max(120).optional(),
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
  const limited = trackingLimiter.check(request);
  if (limited) return limited;

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
        path: data.path,
        referrerDomain: safeDomain(data.referrerDomain),
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        properties: sanitizeTrackingProperties(event, data.properties),
      },
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("[analytics] could not store tracking event", error);
    return NextResponse.json({ error: "No se pudo registrar el evento" }, { status: 500 });
  }
}
