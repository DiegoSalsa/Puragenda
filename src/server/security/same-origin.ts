import { NextRequest, NextResponse } from "next/server";

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  return null;
}
