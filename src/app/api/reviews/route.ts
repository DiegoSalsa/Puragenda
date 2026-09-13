import { NextRequest, NextResponse } from "next/server";
import { appointmentReviewLimiter } from "@/server/lib/rate-limit";
import { requireSameOrigin } from "@/server/security/same-origin";
import { verifyReviewToken } from "@/server/security/review-token";
import { submitReviewSchema } from "@/server/validations/reviews";
import { prisma } from "@/server/db/prisma";
import { getClientPortalAccountFromRequest } from "@/server/services/client-portal.service";
import { submitBookingReview } from "@/server/services/reviews.service";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const blocked = appointmentReviewLimiter.check(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = submitReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
  }

  const account = await getClientPortalAccountFromRequest(request);
  const claims = parsed.data.token ? verifyReviewToken(parsed.data.token) : null;

  if (parsed.data.token && !claims) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
  if (!claims && !account) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const appointmentId = claims?.appointmentId ?? parsed.data.appointmentId ?? null;
  let businessId = claims?.businessId ?? null;

  if (!appointmentId) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  if (!businessId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, businessId: true, customerEmail: true, client: { select: { email: true } } },
    });
    const email = account?.email?.trim().toLowerCase();
    const matches = appointment && email && (
      appointment.customerEmail.trim().toLowerCase() === email
      || appointment.client?.email.trim().toLowerCase() === email
    );
    if (!matches) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }
    businessId = appointment.businessId;
  }

  const result = await submitBookingReview({
    appointmentId,
    businessId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    visibility: parsed.data.visibility,
    verificationSource: account ? "CLIENT_PORTAL" : "BOOKING_TOKEN",
    clientPortalAccountId: account?.id ?? null,
    customerEmail: account?.email ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    visibility: result.review.visibility,
    status: result.review.status,
  });
}
