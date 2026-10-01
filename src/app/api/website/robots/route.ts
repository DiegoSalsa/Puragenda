import { NextRequest } from "next/server";
import { canonicalWebsiteUrl, resolveWebsiteHost } from "@/server/websites/service";
export async function GET(request: NextRequest) {
  const site = await resolveWebsiteHost((request.headers.get("x-puragenda-website-host") ?? request.headers.get("host")) ?? "");
  return new Response(site ? `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${canonicalWebsiteUrl(site)}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
}
