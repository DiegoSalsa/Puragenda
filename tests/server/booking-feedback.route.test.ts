import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { signBookingFeedbackToken } from "@/server/security/booking-feedback-token";
import { proxy } from "@/proxy";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  account: vi.fn(),
  limiter: vi.fn(),
  sameOrigin: vi.fn(),
}));

vi.mock("@/server/lib/rate-limit", () => ({
  bookingFeedbackLimiter: { check: mocks.limiter },
}));
vi.mock("@/server/security/same-origin", () => ({
  requireSameOrigin: mocks.sameOrigin,
}));
vi.mock("@/server/services/booking-feedback.service", async () => {
  const actual = await vi.importActual<typeof import("@/server/services/booking-feedback.service")>(
    "@/server/services/booking-feedback.service",
  );
  return { ...actual, upsertBookingFeedback: mocks.upsert };
});
vi.mock("@/server/services/client-portal.service", () => ({
  getClientPortalAccountFromRequest: mocks.account,
}));

import { POST } from "@/app/api/booking-feedback/route";

function request(body: object, extraHeaders: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/booking-feedback", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
      host: "localhost",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/booking-feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-32-characters";
    mocks.limiter.mockReturnValue(null);
    mocks.sameOrigin.mockReturnValue(null);
    mocks.account.mockResolvedValue(null);
    mocks.upsert.mockResolvedValue({
      ok: true,
      feedback: { rating: "POSITIVE", comment: null, googleReviewClickedAt: null },
    });
  });

  it("saves POSITIVE feedback with a signed token", async () => {
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    const response = await POST(request({ token, rating: "POSITIVE" }));
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: "appt-1",
      businessId: "biz-1",
      rating: "POSITIVE",
    }));
  });

  it("saves IMPROVE feedback", async () => {
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    await POST(request({ token, rating: "IMPROVE" }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ rating: "IMPROVE" }));
  });

  it("saves an optional comment", async () => {
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    await POST(request({ token, comment: "Me costó el profesional" }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      comment: "Me costó el profesional",
    }));
  });

  it("rejects a request without a valid token even if appointmentId is guessed", async () => {
    const response = await POST(request({ token: "a".repeat(40), rating: "POSITIVE", appointmentId: "appt-1" }));
    expect(response.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("does not accept a raw appointmentId from another booking", async () => {
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    await POST(request({ token, appointmentId: "someone-else", rating: "POSITIVE" }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: "appt-1" }));
    expect(mocks.upsert.mock.calls[0][0].appointmentId).not.toBe("someone-else");
  });

  it("records a Google click", async () => {
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    await POST(request({ token, googleReviewClicked: true }));
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ googleReviewClicked: true }));
  });

  it("does not fail the HTTP contract when a duplicate click is sent", async () => {
    mocks.upsert.mockResolvedValue({
      ok: true,
      feedback: { rating: "POSITIVE", comment: null, googleReviewClickedAt: new Date() },
    });
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    const response = await POST(request({ token, googleReviewClicked: true }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, googleReviewClicked: true });
  });

  it("returns origin errors from same-origin protection", async () => {
    mocks.sameOrigin.mockReturnValue(NextResponse.json({ error: "Origen no permitido" }, { status: 403 }));
    const token = signBookingFeedbackToken({ appointmentId: "appt-1", businessId: "biz-1" });
    const response = await POST(request({ token, rating: "POSITIVE" }));
    expect(response.status).toBe(403);
  });
});

describe("admin and business isolation for booking feedback", () => {
  it("lets a superadmin cookie through the admin feedback path", () => {
    const blocked = proxy(new NextRequest("http://localhost/para/x7k9m2v4q8/feedback"));
    expect(blocked.headers.get("location")).toContain("/para/x7k9m2v4q8/login");

    const allowed = proxy(new NextRequest("http://localhost/para/x7k9m2v4q8/feedback", {
      headers: { cookie: "puragenda_admin_session=sas_valid" },
    }));
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("location")).toBeNull();
  });

  it("does not expose a business dashboard feedback page", () => {
    expect(existsSync(join(process.cwd(), "src/app/dashboard/feedback"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/app/api/dashboard/feedback"))).toBe(false);
  });
});
