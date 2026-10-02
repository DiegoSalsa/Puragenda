import { NextRequest } from "next/server";
import { canonicalWebsiteUrl, resolveWebsiteHost } from "@/server/websites/service";
export async function GET(request: NextRequest) {
  const site = await resolveWebsiteHost((request.headers.get("x-puragenda-website-host") ?? request.headers.get("host")) ?? "");
  if (!site) return new Response("", { status: 404 });
  const url = canonicalWebsiteUrl(site);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url}/</loc><lastmod>${site.publishedAt!.toISOString()}</lastmod></url></urlset>`, { headers: { "Content-Type": "application/xml", "Cache-Control": "no-store" } });
}
