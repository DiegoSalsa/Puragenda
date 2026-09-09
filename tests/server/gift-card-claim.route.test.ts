import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/lib/rate-limit", () => ({
  giftCardClaimLimiter: { check: vi.fn(() => null) },
}));
vi.mock("@/server/services/client-portal.service", () => ({
  getClientPortalAccountFromRequest: vi.fn(),
}));
vi.mock("@/server/services/gift-card.service", () => ({
  claimGiftCard: vi.fn(),
}));

import { POST } from "@/app/api/client-portal/gift-cards/claim/route";
import { getClientPortalAccountFromRequest } from "@/server/services/client-portal.service";
import { claimGiftCard } from "@/server/services/gift-card.service";

const account = vi.mocked(getClientPortalAccountFromRequest);
const claim = vi.mocked(claimGiftCard);

function request(body: object) {
  return new NextRequest("http://localhost/api/client-portal/gift-cards/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Gift Card claim route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    account.mockResolvedValue({ id: "account-1" } as never);
    claim.mockResolvedValue({ id: "card-1" } as never);
  });

  it("requires an authenticated canonical portal account", async () => {
    account.mockResolvedValue(null);
    const response = await POST(request({ code: "GC-ABCD-2345" }));
    expect(response.status).toBe(401);
    expect(claim).not.toHaveBeenCalled();
  });

  it("claims by public code for the authenticated account", async () => {
    const response = await POST(request({ code: "GC-ABCD-2345" }));
    expect(response.status).toBe(200);
    expect(claim).toHaveBeenCalledWith({
      accountId: "account-1",
      code: "GC-ABCD-2345",
    });
  });

  it("claims by a high-entropy token", async () => {
    const token = "a".repeat(43);
    await POST(request({ token }));
    expect(claim).toHaveBeenCalledWith({ accountId: "account-1", token });
  });

  it("rejects malformed or absent codes before the service call", async () => {
    const response = await POST(request({ code: "short" }));
    expect(response.status).toBe(400);
    expect(claim).not.toHaveBeenCalled();
  });

  it("does not hide already-claimed or void-card conflicts", async () => {
    claim.mockRejectedValue(new Error("Esta Gift Card ya fue agregada o no está activa"));
    const response = await POST(request({ code: "GC-ABCD-2345" }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Esta Gift Card ya fue agregada o no está activa",
    });
  });
});
