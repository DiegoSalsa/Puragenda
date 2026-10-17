import { timingSafeEqual } from "node:crypto";
import { cleanupMcpData } from "@/server/mcp/retention";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const expected = Buffer.from(process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "");
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return new Response(null, { status: 401 });
  return Response.json(await cleanupMcpData(), { headers: { "Cache-Control": "no-store" } });
}
