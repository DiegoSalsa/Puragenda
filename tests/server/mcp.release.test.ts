import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ state: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { mcpRolloutState: { findUnique: db.state } } }));
import { getMcpRolloutState, mcpAccessAllowed, mcpUserAllowed, mcpBusinessFilter, requireMcpAccess } from "@/server/mcp/rollout";

describe("MCP review access and business release", () => {
  beforeEach(() => {
    vi.clearAllMocks(); db.state.mockResolvedValue(null);
    vi.stubEnv("MCP_ENABLED", "true");
    vi.stubEnv("MCP_REVIEW_USER_IDS", " review-user,review-user ");
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "review-business");
  });
  afterEach(() => vi.unstubAllEnvs());
  it("keeps regular businesses closed when no release has been recorded", async () => {
    expect(await getMcpRolloutState()).toMatchObject({ businessAccessEnabled: false, version: 0 });
    expect(await mcpAccessAllowed("owner", "business")).toBe(false);
    await expect(requireMcpAccess("owner", "business")).rejects.toThrow("MCP_NOT_AVAILABLE");
    expect(await mcpUserAllowed("owner")).toBe(false);
  });
  it("requires both a configured review account and a configured review business", async () => {
    expect(await mcpAccessAllowed("review-user", "review-business")).toBe(true);
    expect(await mcpUserAllowed("review-user")).toBe(true);
    expect(await mcpAccessAllowed("review-user", "real-business")).toBe(false);
    expect(await mcpAccessAllowed("real-owner", "review-business")).toBe(false);
  });
  it("does not grant review access when either list is missing", async () => {
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "");
    expect(await mcpUserAllowed("review-user")).toBe(false);
    expect(await mcpAccessAllowed("review-user", "review-business")).toBe(false);
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "review-business"); vi.stubEnv("MCP_REVIEW_USER_IDS", "");
    expect(await mcpAccessAllowed("review-user", "review-business")).toBe(false);
  });
  it("limits anonymous discovery to the configured review businesses", async () => {
    expect(await mcpBusinessFilter()).toEqual({ id: { in: ["review-business"] } });
    vi.stubEnv("MCP_REVIEW_BUSINESS_IDS", "");
    expect(await mcpBusinessFilter()).toEqual({ id: { in: [] } });
  });
  it("opens access only with a recorded approval and respects the global stop switch", async () => {
    db.state.mockResolvedValue({ businessAccessEnabled: true, approvalReference: "review-approval", approvedAt: new Date(), version: 2 });
    expect(await mcpAccessAllowed("owner", "business")).toBe(true);
    expect(await mcpBusinessFilter()).toEqual({});
    vi.stubEnv("MCP_ENABLED", "false"); db.state.mockClear();
    expect(await mcpAccessAllowed("owner", "business")).toBe(false);
    expect(await mcpAccessAllowed("review-user", "review-business")).toBe(false);
    await expect(mcpBusinessFilter()).rejects.toThrow("MCP_DISABLED");
    expect(db.state).not.toHaveBeenCalled();
  });
  it.each([{ approvedAt: null, approvalReference: "approval" }, { approvedAt: new Date(), approvalReference: " " }])("fails closed for an incomplete approval: %o", async approval => {
    db.state.mockResolvedValue({ businessAccessEnabled: true, ...approval });
    expect(await mcpAccessAllowed("owner", "business")).toBe(false);
  });
});
