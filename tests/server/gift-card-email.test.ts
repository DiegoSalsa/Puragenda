import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const findUniqueMock = vi.hoisted(() => vi.fn());
const updateMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/email/resend", () => ({
  resend: { emails: { send: sendMock } },
  EMAIL_FROM: "Puragenda <qa@example.test>",
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: { giftCard: { findUnique: findUniqueMock, update: updateMock } },
}));

import { sendGiftCardEmail } from "@/server/email/gift-card";

const card = {
  id: "card-1",
  purchaseId: "purchase-1",
  type: "BALANCE",
  nameSnapshot: "Un regalo",
  faceValueSnapshot: 50_000,
  currencyCode: "CLP",
  publicCode: "GC-TEST",
  backgroundColorSnapshot: "#FFF5BA",
  textColorSnapshot: "#111111",
  deliveryEmailSentAt: null,
  deliveryEmailAttempts: 0,
  business: { name: "Negocio QA", logoUrl: null, primaryColor: "#7C3AED" },
  purchase: {
    deliveryMode: "SELF",
    buyerEmail: "buyer@example.test",
    buyerName: "Buyer",
    recipientEmail: null,
    recipientName: null,
    senderName: null,
    giftMessage: null,
  },
  entitlements: [],
};

describe("Gift Card email idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMock.mockResolvedValue({ data: { id: "mail-1" }, error: null });
    findUniqueMock.mockResolvedValue(card);
    updateMock.mockResolvedValue({});
  });

  it("uses one stable key for concurrent initial delivery attempts", async () => {
    await Promise.all([sendGiftCardEmail(card.id), sendGiftCardEmail(card.id)]);

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls.map((call) => call[1])).toEqual([
      { idempotencyKey: "gift-card-card-1-initial" },
      { idempotencyKey: "gift-card-card-1-initial" },
    ]);
  });

  it("skips automatic delivery after the card was already sent", async () => {
    findUniqueMock.mockResolvedValue({ ...card, deliveryEmailSentAt: new Date() });

    await expect(sendGiftCardEmail(card.id)).resolves.toEqual({ skipped: true });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("gives an intentional resend a deterministic next-attempt key", async () => {
    findUniqueMock.mockResolvedValue({ ...card, deliveryEmailSentAt: new Date(), deliveryEmailAttempts: 2 });

    await sendGiftCardEmail(card.id, { resend: true });
    expect(sendMock).toHaveBeenCalledWith(expect.any(Object), { idempotencyKey: "gift-card-card-1-resend-3" });
  });

  it("records a provider rejection without marking the email as sent", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "recipient blocked" } });

    await expect(sendGiftCardEmail(card.id)).rejects.toThrow("recipient blocked");
    expect(updateMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: card.id },
      data: {
        deliveryEmailAttempts: { increment: 1 },
        deliveryEmailLastError: "Resend rechazó el correo de la Gift Card: recipient blocked",
      },
    });
  });
});
