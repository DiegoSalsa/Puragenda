import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/server/auth/user-session", () => ({ getApiSessionUser: vi.fn() }));
vi.mock("@/server/services/business.service", () => ({ getBusinessForUser: vi.fn() }));
vi.mock("@/server/services/permissions.service", () => ({ hasBusinessPermission: vi.fn() }));
vi.mock("@/server/services/gift-card.service", () => ({ issueManualGiftCard: vi.fn() }));
vi.mock("@/server/email/gift-card", () => ({ sendGiftCardEmail: vi.fn() }));

import { POST } from "@/app/api/dashboard/gift-cards/manual/route";
import { getApiSessionUser } from "@/server/auth/user-session";
import { sendGiftCardEmail } from "@/server/email/gift-card";
import { getBusinessForUser } from "@/server/services/business.service";
import { issueManualGiftCard } from "@/server/services/gift-card.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";

const session = vi.mocked(getApiSessionUser);
const businessForUser = vi.mocked(getBusinessForUser);
const permitted = vi.mocked(hasBusinessPermission);
const issue = vi.mocked(issueManualGiftCard);
const sendEmail = vi.mocked(sendGiftCardEmail);

const sale = {
  templateId: "template-1",
  buyerName: "Valentina",
  buyerEmail: "vale@example.com",
  deliveryMode: "SELF",
  manualPaymentMethod: "TRANSFER",
};

function request(body: object = sale) {
  return new NextRequest("http://localhost/api/dashboard/gift-cards/manual", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Gift Card manual issuance route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.mockResolvedValue({ id: "user-1" } as never);
    businessForUser.mockResolvedValue({ id: "business-1" } as never);
    permitted.mockResolvedValue(true);
    issue.mockResolvedValue({ giftCard: { id: "card-1", publicCode: "GC-ABCD-2345" } } as never);
  });

  it("creates and emits a paid manual purchase with the actor", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(issue).toHaveBeenCalledWith(expect.objectContaining({
      businessId: "business-1",
      createdById: "user-1",
      paymentMethod: "MANUAL",
      paymentStatus: "MANUAL_PAID",
      manualPaymentMethod: "TRANSFER",
    }));
    expect(sendEmail).toHaveBeenCalledWith("card-1");
  });

  it("does not require or call Mercado Pago", async () => {
    await POST(request());
    expect(issue).toHaveBeenCalledTimes(1);
    expect(issue.mock.calls[0][0]).not.toHaveProperty("mpPaymentId");
  });

  it("keeps the issued card when email delivery is temporarily unavailable", async () => {
    sendEmail.mockRejectedValue(new Error("mail unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      giftCardId: "card-1",
      emailWarning: expect.any(String),
    });
  });

  it("rejects users without management permission", async () => {
    permitted.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(403);
    expect(issue).not.toHaveBeenCalled();
  });
});
