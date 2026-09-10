import { NextRequest, NextResponse } from "next/server";
import { bookingFeedbackLimiter } from "@/server/lib/rate-limit";
import { requireSameOrigin } from "@/server/security/same-origin";
import { verifyBookingFeedbackToken } from "@/server/security/booking-feedback-token";
import { bookingFeedbackRequestSchema } from "@/server/validations/booking-feedback";
import { deviceTypeFromUserAgent, upsertBookingFeedback } from "@/server/services/booking-feedback.service";
import { getClientPortalAccountFromRequest } from "@/server/services/client-portal.service";

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const blocked = bookingFeedbackLimiter.check(request);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const parsed = bookingFeedbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos" },
      { status: 400 },
    );
  }

  const claims = verifyBookingFeedbackToken(parsed.data.token);
  if (!claims) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const account = await getClientPortalAccountFromRequest(request);
  const result = await upsertBookingFeedback({
    appointmentId: claims.appointmentId,
    businessId: claims.businessId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    googleReviewClicked: parsed.data.googleReviewClicked,
    clientPortalAccountId: account?.id ?? null,
    authenticated: Boolean(account),
    deviceType: deviceTypeFromUserAgent(request.headers.get("user-agent")),
    locale: parsed.data.locale ?? request.headers.get("accept-language")?.split(",")[0]?.slice(0, 16) ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    rating: result.feedback.rating,
    hasComment: Boolean(result.feedback.comment),
    googleReviewClicked: Boolean(result.feedback.googleReviewClickedAt),
  });
}
