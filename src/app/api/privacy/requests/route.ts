import { NextRequest, NextResponse } from "next/server";
import { addBusinessDays } from "date-fns";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { privacyRequestLimiter } from "@/server/lib/rate-limit";

const REQUEST_TYPES = ["ACCESS", "RECTIFICATION", "SUPPRESSION", "OPPOSITION", "PORTABILITY", "BLOCKING"] as const;

const payloadSchema = z.object({
  requestType: z.enum(REQUEST_TYPES),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  details: z.string().trim().min(10).max(4000),
  visitorId: z.string().regex(/^[A-Za-z0-9._-]{16,128}$/).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const limited = privacyRequestLimiter.check(request);
  if (limited) return limited;

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  try {
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos de la solicitud" }, { status: 400 });
    }

    const user = await getApiSessionUser(request);
    const now = new Date();
    // The blocking right has a shorter statutory response deadline. Using
    // date-fns keeps the queue conservative by counting weekdays only;
    // operators must still account for Chilean public holidays.
    const dueAt = parsed.data.requestType === "BLOCKING"
      ? addBusinessDays(now, 2)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const created = await prisma.privacyRequest.create({
      data: {
        requestType: parsed.data.requestType,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        details: parsed.data.details,
        visitorId: parsed.data.visitorId,
        userId: user?.id,
        dueAt,
        initialDueAt: dueAt,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, reference: created.id.slice(-8).toUpperCase() }, { status: 202 });
  } catch (error) {
    console.error("[privacy/requests] could not store request", error);
    return NextResponse.json({ error: "No se pudo registrar la solicitud" }, { status: 500 });
  }
}
