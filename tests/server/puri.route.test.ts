import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), context: vi.fn(), limit: vi.fn(), answer: vi.fn() }));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: mocks.session }));
vi.mock("@/server/puri/context", () => ({ createPuriContext: mocks.context }));
vi.mock("@/server/puri/rate-limit", () => ({ checkPuriRateLimit: mocks.limit }));
vi.mock("@/server/puri/orchestrator", () => ({ answerWithPuri: mocks.answer }));
vi.mock("next-intl/server", () => ({ getLocale: vi.fn().mockResolvedValue("es") }));

import { POST } from "@/app/api/dashboard/puri/route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/dashboard/puri", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("Puri API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: "user-1", role: "STAFF" });
    mocks.context.mockResolvedValue({ business: { id: "business-1" }, user: { id: "user-1" } });
    mocks.limit.mockResolvedValue({ allowed: true, retryAfter: 30 });
    mocks.answer.mockResolvedValue({ message: "Verificado", cards: [], actions: [], toolsUsed: [] });
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
    await expect(response.json()).resolves.toEqual({ answer: { message: "Verificado", cards: [], actions: [], toolsUsed: [] } });
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
});
