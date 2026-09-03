import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_LOGIN_PATH, isKnownCrawler } from "@/lib/crawler-policy";

export const dynamic = "force-dynamic";

/**
 * Public alias for the demo CTA. Marketing pages must not link to
 * `/api/auth/demo` directly: that path is robots-disallowed and Semrush
 * reports it as Googlebot/AI-crawler blocked.
 *
 * Humans are sent to the existing demo login. Known crawlers receive a
 * noindex document and never create a demo session.
 */
export function GET(request: NextRequest) {
  if (isKnownCrawler(request.headers.get("user-agent"))) {
    return new NextResponse(
      `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="robots" content="noindex, nofollow">
    <title>Demo Puragenda</title>
  </head>
  <body>
    <p>Entrada a la cuenta demo de Puragenda. El producto público está en <a href="/">www.puragenda.cl</a>.</p>
  </body>
</html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }

  return NextResponse.redirect(new URL(DEMO_LOGIN_PATH, request.url), 307);
}
