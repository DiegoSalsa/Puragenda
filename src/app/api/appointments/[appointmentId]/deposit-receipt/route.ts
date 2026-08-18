import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { cloudinary } from "@/server/lib/cloudinary";
import { appointmentActionLimiter } from "@/server/lib/rate-limit";
import {
  DEPOSIT_RECEIPT_MAX_BYTES,
  isAllowedDepositReceipt,
  verifyDepositReceiptToken,
} from "@/server/services/deposit-receipt.service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  const limited = appointmentActionLimiter.check(request);
  if (limited) return limited;

  const { appointmentId } = await params;
  const form = await request.formData();
  const token = form.get("receiptToken");
  const file = form.get("receipt");

  if (typeof token !== "string" || !token || !(file instanceof File)) {
    return Response.json({ error: "Falta el comprobante o el acceso a la reserva." }, { status: 400 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      businessId: true,
      status: true,
      paymentStatus: true,
      depositAmount: true,
      depositPaymentUrl: true,
      depositReceiptTokenHash: true,
      depositReceiptPublicId: true,
      depositReceiptResourceType: true,
    },
  });

  if (
    !appointment?.depositReceiptTokenHash ||
    !verifyDepositReceiptToken(token, appointment.depositReceiptTokenHash)
  ) {
    return Response.json({ error: "El enlace para subir el comprobante no es válido." }, { status: 403 });
  }

  if (
    appointment.status !== "AWAITING_PAYMENT" ||
    appointment.paymentStatus !== "PENDING" ||
    !appointment.depositAmount ||
    !appointment.depositPaymentUrl
  ) {
    return Response.json({ error: "Esta reserva ya no admite comprobantes." }, { status: 409 });
  }

  if (!isAllowedDepositReceipt(file)) {
    return Response.json(
      { error: `Sube una imagen JPG, PNG, WEBP o un PDF de hasta ${DEPOSIT_RECEIPT_MAX_BYTES / 1024 / 1024} MB.` },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;
  const publicId = `${appointment.id}-${crypto.randomUUID()}`;

  try {
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: `puragenda/deposit-receipts/${appointment.businessId}`,
      public_id: publicId,
      resource_type: "image",
      type: "authenticated",
      overwrite: false,
    });

    const previousPublicId = appointment.depositReceiptPublicId;
    const previousResourceType = appointment.depositReceiptResourceType || "image";
    const updated = await prisma.appointment.updateMany({
      where: {
        id: appointment.id,
        status: "AWAITING_PAYMENT",
        paymentStatus: "PENDING",
        depositReceiptTokenHash: appointment.depositReceiptTokenHash,
      },
      data: {
        depositReceiptStatus: "PENDING",
        depositReceiptPublicId: uploaded.public_id,
        depositReceiptResourceType: uploaded.resource_type,
        depositReceiptFormat: uploaded.format || null,
        depositReceiptOriginalName: file.name.slice(0, 180),
        depositReceiptUploadedAt: new Date(),
        depositReceiptReviewedAt: null,
        depositReceiptReviewedById: null,
      },
    });

    if (updated.count === 0) {
      await cloudinary.uploader.destroy(uploaded.public_id, {
        resource_type: uploaded.resource_type,
        type: "authenticated",
        invalidate: true,
      });
      return Response.json({ error: "La reserva cambió de estado. Actualiza la página." }, { status: 409 });
    }

    if (previousPublicId) {
      cloudinary.uploader.destroy(previousPublicId, {
        resource_type: previousResourceType,
        type: "authenticated",
        invalidate: true,
      }).catch((error) => console.error("[deposit-receipt] Could not delete replaced receipt", error));
    }

    return Response.json({ status: "PENDING", uploadedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[deposit-receipt] Upload failed", error);
    return Response.json({ error: "No se pudo subir el comprobante. Intenta nuevamente." }, { status: 500 });
  }
}
