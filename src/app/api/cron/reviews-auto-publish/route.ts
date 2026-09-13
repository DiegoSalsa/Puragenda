import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/server/auth/cron";
import { autoPublishPendingReviews } from "@/server/services/reviews.service";
import { sendDueReviewInvitations } from "@/server/services/review-invitation.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const [published, invited] = await Promise.all([
      autoPublishPendingReviews(),
      sendDueReviewInvitations(),
    ]);
    return NextResponse.json({
      ok: true,
      autoPublished: published,
      invitations: invited,
    });
  } catch (error) {
    console.error("[cron] reviews-auto-publish failed", error);
    return NextResponse.json({ error: "No se pudo procesar reseñas" }, { status: 500 });
  }
}
