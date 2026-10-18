import { protectedResourceMetadata } from "@/server/mcp/metadata";
import { noStore, mcpEnabled, mcpUnavailableResponse } from "@/server/mcp/config";
export function GET() { return mcpEnabled() ? Response.json(protectedResourceMetadata(), { headers: noStore }) : mcpUnavailableResponse(); }
