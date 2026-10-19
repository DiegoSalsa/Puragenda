import { prisma } from "@/server/db/prisma";
import { mcpEnabled } from "./config";
import { McpError } from "./security";

export const MCP_ROLLOUT_ID = "global";
const ids = (value: string | undefined) => [...new Set((value || "").split(",").map(id => id.trim()).filter(Boolean))];
export const mcpReviewUserIds = () => ids(process.env.MCP_REVIEW_USER_IDS);
export const mcpReviewBusinessIds = () => ids(process.env.MCP_REVIEW_BUSINESS_IDS);
export const mcpReviewSuppressesEffects = (businessId: string) => process.env.MCP_REVIEW_SUPPRESS_EFFECTS === "true" && mcpReviewBusinessIds().includes(businessId);

export async function getMcpRolloutState() {
  const state = await prisma.mcpRolloutState.findUnique({ where: { id: MCP_ROLLOUT_ID } });
  return {
    businessAccessEnabled: !!(state?.businessAccessEnabled && state.approvedAt && state.approvalReference?.trim()),
    version: state?.version ?? 0,
    approvalReference: state?.approvalReference ?? null,
    approvedAt: state?.approvedAt ?? null,
    updatedAt: state?.updatedAt ?? null,
  };
}

export async function mcpUserAllowed(userId: string) {
  if (!mcpEnabled()) return false;
  if (mcpReviewUserIds().includes(userId) && mcpReviewBusinessIds().length) return true;
  return (await getMcpRolloutState()).businessAccessEnabled;
}

export async function mcpAccessAllowed(userId: string, businessId: string) {
  if (!mcpEnabled()) return false;
  if (mcpReviewUserIds().includes(userId) && mcpReviewBusinessIds().includes(businessId)) return true;
  return (await getMcpRolloutState()).businessAccessEnabled;
}

export async function requireMcpAccess(userId: string, businessId: string) {
  if (!await mcpAccessAllowed(userId, businessId)) throw new McpError("MCP_NOT_AVAILABLE", 403);
}

// Anonymous discovery is limited to the review allowlist until launch, even
// if another business has a historical opt-in or previously issued token.
export async function mcpBusinessFilter() {
  if (!mcpEnabled()) throw new McpError("MCP_DISABLED", 403);
  return (await getMcpRolloutState()).businessAccessEnabled ? {} : { id: { in: mcpReviewBusinessIds() } };
}
