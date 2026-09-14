import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/rate-limit", () => ({
  publicReviewsReadLimiter: { check: () => null },
}));

vi.mock("@/server/services/reviews.service", () => ({
  listPublicReviewsBySlug: vi.fn(),
}));

import { GET } from "@/app/api/reviews/public/route";
import { listPublicReviewsBySlug } from "@/server/services/reviews.service";

describe("GET /api/reviews/public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid slug without querying", async () => {
    const response = await GET(new NextRequest("http://localhost/api/reviews/public?slug=../soccerbarber"));
    expect(response.status).toBe(404);
    expect(listPublicReviewsBySlug).not.toHaveBeenCalled();
  });

  it("returns a public page of published reviews", async () => {
    vi.mocked(listPublicReviewsBySlug).mockResolvedValue({
      businessId: "biz-1",
      total: 21,
      page: 2,
      pageSize: 6,
      items: [{
        id: "rev-1",
        rating: 5,
        comment: "Muy buena atención.",
        publicReviewerName: "Camila S.",
        serviceNameSnapshot: "Manicure Gel",
        publishedAt: new Date("2026-09-10T12:00:00.000Z"),
        submittedAt: new Date("2026-09-10T11:00:00.000Z"),
        businessReply: "Gracias",
        businessRepliedAt: new Date("2026-09-10T13:00:00.000Z"),
      }],
    });
    const response = await GET(new NextRequest("http://localhost/api/reviews/public?slug=estetica-bella&page=2"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(21);
    expect(body.pageSize).toBe(6);
    expect(body.items[0].publicReviewerName).toBe("Camila S.");
    expect(body.items[0].publishedAt).toBe("2026-09-10T12:00:00.000Z");
  });
});
