import crypto from "crypto";
import { prisma } from "@/server/db/prisma";
import type { PosPaymentStatus } from "@prisma/client";

const MERCADO_PAGO_ORDERS_URL = "https://api.mercadopago.com/v1/orders";
const QR_EXPIRATION_MINUTES = 15;

export interface MercadoPagoOrder {
  id?: string;
  user_id?: string | number;
  type?: string;
  external_reference?: string;
  total_amount?: string;
  currency?: string;
  status?: string;
  status_detail?: string;
  type_response?: { qr_data?: string };
  transactions?: {
    payments?: Array<{
      id?: string;
      amount?: string;
      status?: string;
      status_detail?: string;
    }>;
  };
}

export class PosPaymentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "POS_PAYMENT_ERROR",
  ) {
    super(message);
    this.name = "PosPaymentError";
  }
}

export function calculateAppointmentBalance(input: {
  totalPrice: number;
  depositAmount: number;
  approvedPosAmount: number;
}) {
  const amount = input.totalPrice - input.depositAmount - input.approvedPosAmount;
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new PosPaymentError(
      "El saldo debe ser un monto entero para cobrarlo con QR",
      409,
      "INVALID_POS_AMOUNT",
    );
  }
  return Math.max(0, amount);
}

export function mapMercadoPagoOrderStatus(order: MercadoPagoOrder): PosPaymentStatus {
  switch (order.status) {
    case "processed":
      return "APPROVED";
    case "canceled":
      return "CANCELLED";
    case "expired":
      return "EXPIRED";
    case "refunded":
      return "REFUNDED";
    case "created":
    default:
      return "PENDING";
  }
}

function providerErrorMessage(payload: unknown, status: number) {
  if (status === 401 || status === 403) {
    return "La conexión con Mercado Pago no está autorizada. Vuelve a conectar la cuenta del negocio.";
  }
  if (!payload || typeof payload !== "object") return "Mercado Pago rechazó la solicitud";
  const value = payload as { message?: unknown; error?: unknown };
  if (typeof value.message === "string") return value.message.slice(0, 300);
  if (typeof value.error === "string") return value.error.slice(0, 300);
  return "Mercado Pago rechazó la solicitud";
}

export async function createMercadoPagoQrOrder(input: {
  accessToken: string;
  amount: number;
  externalReference: string;
  idempotencyKey: string;
}) {
  const response = await fetch(MERCADO_PAGO_ORDERS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      type: "qr",
      total_amount: String(input.amount),
      description: "Saldo de reserva Puragenda",
      external_reference: input.externalReference,
      expiration_time: `PT${QR_EXPIRATION_MINUTES}M`,
      config: { qr: { mode: "dynamic" } },
      transactions: { payments: [{ amount: String(input.amount) }] },
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null) as MercadoPagoOrder | null;
  if (!response.ok || !payload?.id || !payload.type_response?.qr_data) {
    throw new PosPaymentError(
      providerErrorMessage(payload, response.status),
      response.status >= 400 && response.status < 500 ? 409 : 502,
      "MERCADOPAGO_ORDER_FAILED",
    );
  }
  return payload;
}

export async function getMercadoPagoOrder(accessToken: string, providerOrderId: string) {
  const response = await fetch(`${MERCADO_PAGO_ORDERS_URL}/${encodeURIComponent(providerOrderId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as MercadoPagoOrder | null;
  if (!response.ok || !payload?.id) {
    throw new PosPaymentError(
      providerErrorMessage(payload, response.status),
      response.status === 404 ? 404 : 502,
      "MERCADOPAGO_ORDER_LOOKUP_FAILED",
    );
  }
  return payload;
}

export function validateMercadoPagoOrder(input: {
  order: MercadoPagoOrder;
  providerOrderId?: string | null;
  providerUserId?: string | null;
  externalReference: string;
  amount: number;
  currency: string;
}) {
  const payment = input.order.transactions?.payments?.[0];
  const orderAmount = Number(input.order.total_amount);
  const paymentAmount = payment?.amount == null ? orderAmount : Number(payment.amount);
  const matches =
    input.order.type === "qr" &&
    (!input.providerOrderId || input.order.id === input.providerOrderId) &&
    (!input.providerUserId || String(input.order.user_id) === input.providerUserId) &&
    input.order.external_reference === input.externalReference &&
    input.order.currency === input.currency &&
    orderAmount === input.amount &&
    paymentAmount === input.amount;

  if (!matches) {
    throw new PosPaymentError(
      "La orden recibida no coincide con el cobro registrado",
      409,
      "MERCADOPAGO_ORDER_MISMATCH",
    );
  }
}

export async function syncPosPaymentFromOrder(paymentId: string, order: MercadoPagoOrder) {
  const payment = await prisma.posPayment.findUnique({
    where: { id: paymentId },
    include: { business: { select: { mpUserId: true } } },
  });
  if (!payment) throw new PosPaymentError("Cobro no encontrado", 404, "POS_PAYMENT_NOT_FOUND");

  validateMercadoPagoOrder({
    order,
    providerOrderId: payment.providerOrderId,
    providerUserId: payment.business.mpUserId,
    externalReference: payment.externalReference,
    amount: payment.amount,
    currency: payment.currency,
  });

  const status = mapMercadoPagoOrderStatus(order);
  return prisma.posPayment.update({
    where: { id: payment.id },
    data: {
      status,
      statusDetail: order.status_detail ?? order.transactions?.payments?.[0]?.status_detail ?? null,
      providerPaymentId: order.transactions?.payments?.[0]?.id ?? payment.providerPaymentId,
      providerUserId: order.user_id == null ? payment.providerUserId : String(order.user_id),
      paidAt: status === "APPROVED" ? payment.paidAt ?? new Date() : payment.paidAt,
      lastSyncedAt: new Date(),
    },
  });
}

export function newPosProviderIdentifiers() {
  return {
    externalReference: `pos_${crypto.randomUUID()}`,
    idempotencyKey: crypto.randomUUID(),
  };
}

export function posQrExpiresAt() {
  return new Date(Date.now() + QR_EXPIRATION_MINUTES * 60 * 1000);
}
