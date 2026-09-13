import { NextRequest, NextResponse } from "next/server";
import { appointmentReviewLimiter } from "@/server/lib/rate-limit";
import { requireSameOrigin } from "@/server/security/same-origin";
import { verifyReviewToken } from "@/server/security/review-token";
import { editReviewSchema } from "@/server/validations/reviews";
import { getClientPortalAccountFromRequest } from "@/server/services/client-portal.service";
import { editBookingReview, withdrawBookingReview } from "@/server/services/reviews.service";
import { prisma } from "@/server/db/prisma";

async function authorizeCustomer(request: NextRequest, reviewId: string, token?: string) {
  const account = await getClientPortalAccountFromRequest(request);
  const claims = token ? verifyReviewToken(token) : null;
  if (!claims && !account) return { error: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };

  const review = await prisma.appointmentReview.findUnique({
    where: { id: reviewId },
    select: { id: true, appointmentId: true, businessId: true },
  });
  if (!review) return { error: NextResponse.json({ error: "No encontramos esa opinión." }, { status: 404 }) };

  if (claims && (claims.appointmentId !== review.appointmentId || claims.businessId !== review.businessId)) {
    return { error: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };
  }

  return {
    review,
    email: account?.email ?? null,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const blocked = appointmentReviewLimiter.check(request);
  if (blocked) return blocked;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const parsed = editReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
  }

  const auth = await authorizeCustomer(request, id, parsed.data.token);
  if ("error" in auth && auth.error) return auth.error;

  const result = await editBookingReview({
    reviewId: auth.review!.id,
    appointmentId: auth.review!.appointmentId,
    businessId: auth.review!.businessId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    visibility: parsed.data.visibility,
    customerEmail: auth.email,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, visibility: result.review.visibility, status: result.review.status });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const blocked = appointmentReviewLimiter.check(request);
  if (blocked) return blocked;

  const { id } = await params;
  let token: string | undefined;
  try {
    const body = await request.json();
    token = typeof body?.token === "string" ? body.token : undefined;
  } catch {
    token = undefined;
  }

  const auth = await authorizeCustomer(request, id, token);
  if ("error" in auth && auth.error) return auth.error;

  const result = await withdrawBookingReview({
    reviewId: auth.review!.id,
    appointmentId: auth.review!.appointmentId,
    businessId: auth.review!.businessId,
    customerEmail: auth.email,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
