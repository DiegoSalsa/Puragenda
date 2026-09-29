import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), context: vi.fn(), feedbackFind: vi.fn(), feedbackUpsert: vi.fn(), uiCreate: vi.fn(),
}));
vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: mocks.session }));
vi.mock("@/server/puri/context", () => ({ createPuriContext: mocks.context }));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  puriRequest: { findFirst: mocks.feedbackFind }, puriFeedback: { upsert: mocks.feedbackUpsert }, puriUiEvent: { create: mocks.uiCreate },
} }));

import { POST as feedback } from "@/app/api/dashboard/puri/feedback/route";
import { POST as events } from "@/app/api/dashboard/puri/events/route";
import { PuriAccessError } from "@/server/puri/types";

function request(path: string, body: unknown, origin = "http://localhost") {
  return new NextRequest("http://localhost" + path, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("Puri monitoring endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: "user-1", role: "STAFF" });
    mocks.context.mockResolvedValue({ business: { id: "business-1" }, location: { id: "location-1" } });
    mocks.feedbackFind.mockResolvedValue({ id: "response-1", businessId: "business-1" });
    mocks.feedbackUpsert.mockResolvedValue({});
    mocks.uiCreate.mockResolvedValue({});
  });

  it("blocks unauthenticated and cross-origin UI events", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await events(request("/api/dashboard/puri/events", { event: "opened", sessionId: crypto.randomUUID() }))).status).toBe(401);
    expect((await events(request("/api/dashboard/puri/events", { event: "opened", sessionId: crypto.randomUUID() }, "https://attacker.test"))).status).toBe(403);
    expect(mocks.uiCreate).not.toHaveBeenCalled();
  });

  it("binds UI events to the authenticated business and rejects invalid scopes", async () => {
    const body = { event: "opened", sessionId: crypto.randomUUID() };
    expect((await events(request("/api/dashboard/puri/events", body))).status).toBe(202);
    expect(mocks.uiCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ businessId: "business-1", userId: "user-1", event: "opened" }) });
    mocks.context.mockRejectedValue(new PuriAccessError("LOCATION_FORBIDDEN"));
    expect((await events(request("/api/dashboard/puri/events", body))).status).toBe(403);
  });

  it("distinguishes a telemetry outage from a permission denial without leaking details", async () => {
    mocks.uiCreate.mockRejectedValue(new Error("postgres Authorization: Bearer private"));
    const result = await events(request("/api/dashboard/puri/events", { event: "opened", sessionId: crypto.randomUUID() }));
    expect(result.status).toBe(503);
    expect(JSON.stringify(await result.json())).toBe('{"code":"UNAVAILABLE"}');
  });

  it("prevents feedback on another user's response", async () => {
    mocks.feedbackFind.mockResolvedValue(null);
    const result = await feedback(request("/api/dashboard/puri/feedback", { responseId: "other-response", rating: "negative" }));
    expect(result.status).toBe(404);
    expect(mocks.feedbackFind).toHaveBeenCalledWith({ where: { id: "other-response", userId: "user-1" }, select: { id: true, businessId: true } });
    expect(mocks.feedbackUpsert).not.toHaveBeenCalled();
  });

  it("saves only an allowlisted rating and reason", async () => {
    const result = await feedback(request("/api/dashboard/puri/feedback", { responseId: "response-1", rating: "negative", reason: "missing_information" }));
    expect(result.status).toBe(200);
    expect(mocks.feedbackUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { requestId: "response-1" },
      create: expect.objectContaining({ businessId: "business-1", userId: "user-1", reason: "missing_information" }),
    }));
    expect((await feedback(request("/api/dashboard/puri/feedback", { responseId: "response-1", rating: "negative", comment: "private text" }))).status).toBe(400);
  });

  it("upserts one current rating per response across repeat and changed clicks", async () => {
    const ratings = new Map<string, string>();
    mocks.feedbackUpsert.mockImplementation(async ({ where, create, update }) => {
      ratings.set(where.requestId, ratings.has(where.requestId) ? update.rating : create.rating);
      return {};
    });
    for (const rating of ["positive", "positive", "negative"]) {
      expect((await feedback(request("/api/dashboard/puri/feedback", { responseId: "response-1", rating }))).status).toBe(200);
    }
    expect(ratings.size).toBe(1);
    expect(ratings.get("response-1")).toBe("negative");
  });
});
