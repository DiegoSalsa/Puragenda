import { mcpEnabled, mcpUnavailableResponse } from "@/server/mcp/config";
export function GET() {
  if (!mcpEnabled()) return mcpUnavailableResponse();
  const challenge = process.env.OPENAI_APPS_CHALLENGE;
  if (!challenge || !/^[\x21-\x7e]{1,4096}$/.test(challenge)) return new Response(null, { status: 404 });
  return new Response(challenge, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
