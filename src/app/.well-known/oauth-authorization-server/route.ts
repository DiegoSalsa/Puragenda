import { authorizationServerMetadata } from "@/server/mcp/metadata";
import { noStore, mcpEnabled, mcpUnavailableResponse } from "@/server/mcp/config";
export function GET() { return mcpEnabled() ? Response.json(authorizationServerMetadata(), { headers: noStore }) : mcpUnavailableResponse(); }
