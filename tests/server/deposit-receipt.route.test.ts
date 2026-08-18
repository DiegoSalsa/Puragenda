import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashDepositReceiptToken } from "@/server/services/deposit-receipt.service";

vi.mock("@/server/lib/rate-limit", () => ({
  appointmentActionLimiter: { check: vi.fn(() => null) },
}));

vi.mock("@/server/lib/cloudinary", () => ({
  cloudinary: {
    uploader: { upload: vi.fn(), destroy: vi.fn() },
  },
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    appointment: { findUnique: vi.fn(), updateMany: vi.fn() },
  },
}));

import { POST } from "@/app/api/appointments/[appointmentId]/deposit-receipt/route";
import { cloudinary } from "@/server/lib/cloudinary";
import { prisma } from "@/server/db/prisma";

const token = "valid-receipt-token";
const appointment = {
  id: "appointment-1",
  businessId: "business-1",
  status: "AWAITING_PAYMENT",
  paymentStatus: "PENDING",
  depositAmount: 5000,
  depositPaymentUrl: "https://mpago.la/example",
  depositReceiptTokenHash: hashDepositReceiptToken(token),
  depositReceiptPublicId: null,
  depositReceiptResourceType: null,
};

function uploadRequest(receiptToken = token, file = new File(["proof"], "proof.png", { type: "image/png" })) {
  const form = new FormData();
  form.set("receiptToken", receiptToken);
  form.set("receipt", file);
  return new NextRequest("http://localhost/api/appointments/appointment-1/deposit-receipt", {
    method: "POST",
    body: form,
  });
}

describe("deposit receipt upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(appointment as never);
    vi.mocked(prisma.appointment.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(cloudinary.uploader.upload).mockResolvedValue({
      public_id: "puragenda/deposit-receipts/business-1/appointment-1-new",
      resource_type: "image",
      format: "png",
    } as never);
  });

  it("stores a valid receipt as an authenticated asset pending review", async () => {
    const response = await POST(uploadRequest(), {
      params: Promise.resolve({ appointmentId: "appointment-1" }),
    });

    expect(response.status).toBe(200);
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/),
      expect.objectContaining({ type: "authenticated", resource_type: "image", overwrite: false }),
    );
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ depositReceiptStatus: "PENDING", depositReceiptOriginalName: "proof.png" }),
    }));
  });

  it("rejects a forged upload token before sending the file to storage", async () => {
    const response = await POST(uploadRequest("wrong-token"), {
      params: Promise.resolve({ appointmentId: "appointment-1" }),
    });

    expect(response.status).toBe(403);
    expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
  });
});
