import { NextRequest, NextResponse } from "next/server";

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = (forwardedHost || request.headers.get("host") || request.nextUrl.host).toLowerCase();
  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host.toLowerCase() : "";
  } catch {
    originHost = "";
  }
  // nextUrl can contain Vercel's internal deployment host. The forwarded/Host
  // header is the browser-visible authority and is therefore the correct CSRF
  // comparison target behind a trusted platform proxy.
  if (!originHost || originHost !== requestHost) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }
  return null;
}
