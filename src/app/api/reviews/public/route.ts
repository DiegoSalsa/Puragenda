import { NextRequest, NextResponse } from "next/server";
import { publicReviewsReadLimiter } from "@/server/lib/rate-limit";
import { listPublicReviewsBySlug } from "@/server/services/reviews.service";

const SLUG = /^[a-z0-9-]{2,80}$/;

export async function GET(request: NextRequest) {
  const blocked = publicReviewsReadLimiter.check(request);
  if (blocked) return blocked;

  const slug = request.nextUrl.searchParams.get("slug")?.trim() ?? "";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  if (!SLUG.test(slug)) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const result = await listPublicReviewsBySlug(slug, page);
  if (!result) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    items: result.items.map((item) => ({
      ...item,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      submittedAt: item.submittedAt.toISOString(),
      businessRepliedAt: item.businessRepliedAt?.toISOString() ?? null,
    })),
  });
}
