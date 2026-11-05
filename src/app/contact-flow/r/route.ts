import { NextRequest } from "next/server";
import { contactLabEnabled } from "@/server/contact-flow/policy";
import { contactPublicLimiter } from "@/server/contact-flow/http";
import { bookingDestination } from "@/server/contact-flow/tokens";
export async function GET(request: NextRequest) {
  if (!contactLabEnabled()) return new Response(null, { status: 404 });
  const limited = await contactPublicLimiter.check(request);
  if (limited) return limited;
  try {
    const destination = await bookingDestination(
      request.nextUrl.searchParams.get("token") ?? "",
    );
    return new Response(null, {
      status: 303,
      headers: {
        Location: destination,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return new Response("Enlace no disponible", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
