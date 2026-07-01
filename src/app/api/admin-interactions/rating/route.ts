import { NextRequest, NextResponse } from "next/server";
import { submitInteractiveResponse } from "@/server/services/admin-interactions.service";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const rating = Number(request.nextUrl.searchParams.get("rating") || "0");

  const result = await submitInteractiveResponse({ token, rating });
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");

  if (result.error) {
    return NextResponse.redirect(`${baseUrl}/responder/${encodeURIComponent(token)}?error=1`);
  }

  return NextResponse.redirect(`${baseUrl}/responder/${encodeURIComponent(token)}?thanks=1`);
}
