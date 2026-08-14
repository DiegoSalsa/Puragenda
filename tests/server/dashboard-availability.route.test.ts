import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  business: vi.fn(),
  availability: vi.fn(),
}));

vi.mock("@/server/auth/user-session", () => ({
  getApiSessionUser: mocks.session,
}));

vi.mock("@/server/services/business.service", () => ({
  getBusinessForUser: mocks.business,
}));

vi.mock("@/server/services/dashboard-availability.service", async () => {
  const actual = await vi.importActual<typeof import("@/server/services/dashboard-availability.service")>(
    "@/server/services/dashboard-availability.service",
  );
  return {
    DashboardAvailabilityError: actual.DashboardAvailabilityError,
    getDashboardAvailability: mocks.availability,
  };
});

import { POST } from "@/app/api/dashboard/availability/route";
import { DashboardAvailabilityError } from "@/server/services/dashboard-availability.service";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/dashboard/availability", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("dashboard availability route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: "user-1", role: "ADMIN" });
    mocks.business.mockResolvedValue({ id: "business-1", ownerId: "user-1" });
    mocks.availability.mockResolvedValue({
      timezone: "UTC",
      generatedAt: "2026-08-13T12:00:00.000Z",
      durationMinutes: 60,
      serviceNames: ["Corte"],
      days: [],
    });
  });

  it("requires an authenticated dashboard session", async () => {
    mocks.session.mockResolvedValue(null);
    const response = await POST(request({}));
    expect(response.status).toBe(401);
    expect(mocks.availability).not.toHaveBeenCalled();
  });

  it("rejects malformed availability requests", async () => {
    const response = await POST(request({ locationId: "location-1", serviceIds: [] }));
    expect(response.status).toBe(400);
    expect(mocks.availability).not.toHaveBeenCalled();
  });

  it("returns live availability without allowing caching", async () => {
    const response = await POST(request({
      locationId: "location-1",
      serviceIds: ["service-1"],
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-14",
      days: 7,
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.availability).toHaveBeenCalledTimes(1);
  });

  it("accepts a seven-day overview without service configuration", async () => {
    const response = await POST(request({
      mode: "overview",
      locationId: "location-1",
      fromDate: "2026-08-14",
      days: 7,
    }));

    expect(response.status).toBe(200);
    expect(mocks.availability).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ mode: "overview", serviceIds: [], days: 7 }),
    );
  });

  it("preserves permission errors from the availability service", async () => {
    mocks.availability.mockRejectedValue(new DashboardAvailabilityError(
      "STAFF_FORBIDDEN",
      "No tienes acceso al profesional seleccionado",
      403,
    ));

    const response = await POST(request({
      locationId: "location-1",
      serviceIds: ["service-1"],
      staffId: "staff-2",
      selectedOptionAlternativeIds: [],
      fromDate: "2026-08-14",
      days: 7,
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "STAFF_FORBIDDEN" });
  });
});
