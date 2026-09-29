import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), context: vi.fn(), limit: vi.fn(), answer: vi.fn(), create: vi.fn(), businessFind: vi.fn(), uiCreate: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: mocks.session }));
vi.mock("@/server/puri/context", () => ({ createPuriContext: mocks.context }));
vi.mock("@/server/puri/rate-limit", () => ({ checkPuriRateLimit: mocks.limit }));
vi.mock("@/server/puri/orchestrator", () => ({ answerWithPuri: mocks.answer }));
vi.mock("@/server/db/prisma", () => ({ prisma: { puriRequest: { create: mocks.create }, business: { findFirst: mocks.businessFind }, puriUiEvent: { create: mocks.uiCreate } } }));
vi.mock("next-intl/server", () => ({ getLocale: vi.fn().mockResolvedValue("es") }));

import { POST } from "@/app/api/dashboard/puri/route";
import { PuriAccessError } from "@/server/puri/types";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/dashboard/puri", {
    method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify(body),
  });
}

describe("Puri API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: "user-1", role: "STAFF" });
    mocks.context.mockResolvedValue({ business: { id: "business-1" }, user: { id: "user-1" } });
    mocks.limit.mockResolvedValue({ allowed: true, retryAfter: 30 });
    mocks.answer.mockResolvedValue({ message: "Verificado", cards: [], actions: [], toolsUsed: [] });
    mocks.create.mockResolvedValue({ id: "response-1" });
    mocks.businessFind.mockResolvedValue({ id: "business-1" });
    mocks.uiCreate.mockResolvedValue({});
  });

  it("requires authentication before any tool or model call", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request({ message: "Hola" }))).status).toBe(401);
    expect(mocks.context).not.toHaveBeenCalled();
    expect(mocks.answer).not.toHaveBeenCalled();
  });

  it("rejects malformed and oversized requests", async () => {
    expect((await POST(request({ message: "" }))).status).toBe(400);
    expect((await POST(request({ message: "x".repeat(2001) }))).status).toBe(400);
    expect(mocks.answer).not.toHaveBeenCalled();
  });

  it("uses server locale, scopes rate limiting and returns a structured uncached answer", async () => {
    const response = await POST(request({ message: "Hoy", context: { pathname: "/dashboard", locale: "de" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.context).toHaveBeenCalledWith(expect.objectContaining({ id: "user-1" }), expect.objectContaining({ locale: "es" }));
    expect(mocks.limit).toHaveBeenCalledWith("business-1:user-1");
    await expect(response.json()).resolves.toEqual({ answer: { message: "Verificado", cards: [], actions: [], toolsUsed: [] }, responseId: "response-1" });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ businessId: "business-1", userId: "user-1", status: "SUCCESS" }) }));
  });

  it("stops before the model when the rate limit is reached", async () => {
    mocks.limit.mockResolvedValue({ allowed: false, retryAfter: 60 });
    const response = await POST(request({ message: "Hoy" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(mocks.answer).not.toHaveBeenCalled();
  });

  it("handles model errors without leaking their message", async () => {
    mocks.answer.mockRejectedValue(new Error("secret upstream error"));
    const response = await POST(request({ message: "Hoy" }));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret upstream error");
  });

  it("records provider timeouts as structured timeout metadata", async () => {
    const timeout = new Error("private upstream detail");
    timeout.name = "APIConnectionTimeoutError";
    mocks.answer.mockRejectedValue(timeout);
    expect((await POST(request({ message: "Hoy" }))).status).toBe(503);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "TIMEOUT", errorCode: "MODEL_TIMEOUT" }) }));
  });

  it("records invalid location scope without querying another tenant", async () => {
    mocks.context.mockRejectedValue(new PuriAccessError("LOCATION_FORBIDDEN"));
    const response = await POST(request({ message: "Hoy", context: { locationSlug: "other-business" } }));
    expect(response.status).toBe(403);
    expect(mocks.answer).not.toHaveBeenCalled();
    expect(mocks.uiCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ event: "permission_denied", businessId: "business-1", errorCode: "LOCATION_FORBIDDEN" }) });
  });

  it("persists structured outcomes and provider usage without private content", async () => {
    mocks.answer.mockImplementation(async ({ telemetry }) => {
      telemetry.model = "provider-model-qa";
      telemetry.promptTokens = 120;
      telemetry.completionTokens = 30;
      telemetry.cachedTokens = 20;
      telemetry.modelDurationMs = 340;
      telemetry.toolsDurationMs = 75;
      telemetry.toolCalls = [
        { toolName: "getAvailability", status: "SUCCESS", durationMs: 20, resultCount: 2 },
        { toolName: "getAppointments", status: "NO_DATA", durationMs: 15, resultCount: 0 },
        { toolName: "getRevenueSummary", status: "DENIED", durationMs: 10, errorCode: "FORBIDDEN" },
        { toolName: "getStaffSummary", status: "ERROR", durationMs: 20, errorCode: "TOOL_ERROR" },
        { toolName: "getStoryInsights", status: "TIMEOUT", durationMs: 10, errorCode: "TIMEOUT" },
      ];
      return { message: "Private response with client@example.com", cards: [], actions: [], toolsUsed: [] };
    });
    const result = await POST(request({ message: "Private prompt: 5551234567", sessionId: "00000000-0000-4000-8000-000000000001" }));
    expect(result.status).toBe(200);
    const data = mocks.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      businessId: "business-1", userId: "user-1", status: "SUCCESS", intent: "disponibilidad",
      model: "provider-model-qa", promptTokens: 120, completionTokens: 30, cachedTokens: 20,
      modelDurationMs: 340, toolsDurationMs: 75,
    });
    expect(data.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(data.toolCalls.create.map((call: { status: string }) => call.status)).toEqual(["SUCCESS", "NO_DATA", "DENIED", "ERROR", "TIMEOUT"]);
    const persisted = JSON.stringify(data);
    for (const marker of ["Private prompt", "Private response", "5551234567", "client@example.com", "Authorization", "Bearer", "DATABASE_URL"]) {
      expect(persisted).not.toContain(marker);
    }
  });
});
