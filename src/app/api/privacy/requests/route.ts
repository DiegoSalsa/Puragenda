import { NextRequest, NextResponse } from "next/server";
import { addBusinessDays } from "date-fns";
import { z } from "zod";
import { getApiSessionUser } from "@/server/auth/user-session";
import { prisma } from "@/server/db/prisma";
import { privacyDistributedLimiter } from "@/server/lib/distributed-rate-limit";
import { requireSameOrigin } from "@/server/security/same-origin";
import { hashPrivacyEmail, normalizePrivacyEmail } from "@/lib/privacy/identity";
import { sendPrivacyRequestAcknowledgement, sendPrivacyRequestAdminAlert } from "@/server/email/privacy";

const REQUEST_TYPES = ["ACCESS", "RECTIFICATION", "SUPPRESSION", "OPPOSITION", "PORTABILITY", "BLOCKING"] as const;

const payloadSchema = z.object({
  requestType: z.enum(REQUEST_TYPES),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  details: z.string().trim().min(10).max(4000),
  visitorId: z.string().regex(/^[A-Za-z0-9._-]{16,128}$/).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const limited = await privacyDistributedLimiter.check(request);
  if (limited) return limited;

  const originError = requireSameOrigin(request);
  if (originError) return originError;

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
    const email = normalizePrivacyEmail(parsed.data.email);
    const created = await prisma.$transaction(async (tx) => {
      const privacyRequest = await tx.privacyRequest.create({ data: {
        requestType: parsed.data.requestType,
        name: parsed.data.name,
        email,
        details: parsed.data.details,
        visitorId: parsed.data.visitorId,
        userId: user?.id,
        dueAt,
        initialDueAt: dueAt,
      }, select: { id: true } });

      if (["BLOCKING", "OPPOSITION", "SUPPRESSION"].includes(parsed.data.requestType)) {
        await tx.privacyRestriction.create({
          data: {
            emailHash: hashPrivacyEmail(email),
            visitorId: parsed.data.visitorId,
            userId: user?.id,
            reason: `PENDING_${parsed.data.requestType}`,
            sourceRequestId: privacyRequest.id,
          },
        });
      }
      return privacyRequest;
    });

    const reference = created.id.slice(-8).toUpperCase();
    let acknowledgementError: string | null = null;
    let acknowledgementSentAt: Date | null = null;
    let adminNotifiedAt: Date | null = null;
    try {
      await sendPrivacyRequestAcknowledgement({ email, name: parsed.data.name, reference, requestType: parsed.data.requestType, dueAt });
      acknowledgementSentAt = new Date();
    } catch (error) {
      acknowledgementError = error instanceof Error ? error.message.slice(0, 500) : "Error de correo";
      console.error("[privacy/requests] acknowledgement failed", error);
    }
    try {
      await sendPrivacyRequestAdminAlert({ reference, requestType: parsed.data.requestType, dueAt });
      adminNotifiedAt = new Date();
    } catch (error) {
      console.error("[privacy/requests] admin alert failed", error);
    }
    await prisma.privacyRequest.update({
      where: { id: created.id },
      data: { acknowledgementSentAt, acknowledgementError, adminNotifiedAt },
    });

    return NextResponse.json({ ok: true, reference }, { status: 202 });
  } catch (error) {
    console.error("[privacy/requests] could not store request", error);
    return NextResponse.json({ error: "No se pudo registrar la solicitud" }, { status: 500 });
  }
}
