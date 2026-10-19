import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ auth: vi.fn(), recent: vi.fn(), state: vi.fn(), upsert: vi.fn(), audit: vi.fn(), transaction: vi.fn(), lock: vi.fn() }));
vi.mock("@/server/auth/admin-session", () => ({ requireSuperAdminSession: calls.auth, isRecentAdminAuth: calls.recent, stepUpRequiredResult: () => ({ error: "STEP_UP_REQUIRED" }) }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $transaction: calls.transaction } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { setMcpBusinessAccess } from "@/server/actions/mcp-rollout.actions";

const enable = { enabled: true, expectedVersion: 0, approvalConfirmed: true, approvalReference: "OpenAI approval reference" };
describe("superadmin release control", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("MCP_ENABLED", "true");
    calls.auth.mockResolvedValue({ id: "admin" }); calls.recent.mockReturnValue(true); calls.state.mockResolvedValue(null);
    calls.transaction.mockImplementation(async run => run({ $executeRaw: calls.lock, mcpRolloutState: { findUnique: calls.state, upsert: calls.upsert }, auditLog: { create: calls.audit } }));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("requires a real superadmin session before reading or changing state", async () => {
    calls.auth.mockRejectedValueOnce(new Error("Acceso denegado"));
    await expect(setMcpBusinessAccess(enable)).rejects.toThrow("Acceso denegado");
    expect(calls.transaction).not.toHaveBeenCalled();
  });
  it.each([{ approvalConfirmed: false }, { approvalReference: "" }])("requires explicit approval details: %o", async value => {
    expect(await setMcpBusinessAccess({ ...enable, ...value })).toHaveProperty("error");
    expect(calls.transaction).not.toHaveBeenCalled();
  });
  it("requires recent admin authentication to enable", async () => {
    calls.recent.mockReturnValue(false);
    expect(await setMcpBusinessAccess(enable)).toEqual({ error: "STEP_UP_REQUIRED" });
    expect(calls.transaction).not.toHaveBeenCalled();
  });
  it("does not launch when the server is off", async () => {
    vi.stubEnv("MCP_ENABLED", "false");
    expect(await setMcpBusinessAccess(enable)).toHaveProperty("error");
    expect(calls.transaction).not.toHaveBeenCalled();
  });
  it("records the approval and audit within the same serialized transaction", async () => {
    expect(await setMcpBusinessAccess(enable)).toEqual({ success: true });
    expect(calls.lock).toHaveBeenCalledOnce();
    expect(calls.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ id: "global", businessAccessEnabled: true, version: 1, approvedAt: expect.any(Date), approvalReference: enable.approvalReference }) }));
    expect(calls.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "admin", action: "MCP_BUSINESS_ACCESS_ENABLED" }) });
  });
  it("rejects stale forms without overwriting a newer decision", async () => {
    calls.state.mockResolvedValue({ version: 2, businessAccessEnabled: false });
    expect(await setMcpBusinessAccess(enable)).toHaveProperty("error");
    expect(calls.upsert).not.toHaveBeenCalled(); expect(calls.audit).not.toHaveBeenCalled();
  });
  it("allows a valid admin to stop businesses immediately, preserving review access", async () => {
    calls.state.mockResolvedValue({ version: 1, businessAccessEnabled: true }); calls.recent.mockReturnValue(false);
    expect(await setMcpBusinessAccess({ enabled: false, expectedVersion: 1 })).toEqual({ success: true });
    expect(calls.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { businessAccessEnabled: false, version: 2 } }));
    expect(calls.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "MCP_BUSINESS_ACCESS_PAUSED" }) });
  });
});
