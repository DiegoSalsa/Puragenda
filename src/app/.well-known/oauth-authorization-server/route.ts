import { authorizationServerMetadata } from "@/server/mcp/metadata";
import { noStore } from "@/server/mcp/config";
export function GET() { return Response.json(authorizationServerMetadata(), { headers: noStore }); }
