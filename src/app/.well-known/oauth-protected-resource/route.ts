import { protectedResourceMetadata } from "@/server/mcp/metadata";
import { noStore } from "@/server/mcp/config";
export function GET() { return Response.json(protectedResourceMetadata(), { headers: noStore }); }
