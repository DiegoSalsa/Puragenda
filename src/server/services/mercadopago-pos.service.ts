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

export interface MercadoPagoCheckoutPreference {
  id?: string;
  init_point?: string;
  collector_id?: string | number;
  external_reference?: string;
}

export interface MercadoPagoCheckoutPayment {
  id?: string | number;
  collector_id?: string | number;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  status?: string;
  status_detail?: string;
}

export class PosPaymentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "POS_PAYMENT_ERROR",
    readonly providerStatus?: number,
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
  externalPosId: string;
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
      config: { qr: { external_pos_id: input.externalPosId, mode: "dynamic" } },
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
      response.status,
    );
  }
  return payload;
}

export function mercadoPagoPosExternalId(providerUserId: string) {
  const normalized = providerUserId.replace(/[^a-zA-Z0-9]/g, "");
  if (!normalized) {
    throw new PosPaymentError("La cuenta de Mercado Pago no tiene un identificador valido", 409);
  }
  return `PURAGENDA${normalized}POS1`.slice(0, 40);
}

export function isMercadoPagoCheckoutPreferenceId(providerOrderId: string) {
  return !providerOrderId.startsWith("ORD");
}

export async function createMercadoPagoCheckoutPreference(input: {
  accessToken: string;
  amount: number;
  currency: string;
  externalReference: string;
  idempotencyKey: string;
  expiresAt: Date;
}) {
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      items: [{
        id: input.externalReference,
        title: "Saldo de reserva PuraAgenda",
        description: "Pago presencial de saldo pendiente",
        quantity: 1,
        unit_price: input.amount,
        currency_id: input.currency,
      }],
      external_reference: input.externalReference,
      statement_descriptor: "PURAGENDA",
      expires: true,
      expiration_date_to: input.expiresAt.toISOString(),
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null) as MercadoPagoCheckoutPreference | null;
  if (!response.ok || !payload?.id || !payload.init_point) {
    throw new PosPaymentError(
      providerErrorMessage(payload, response.status),
      response.status >= 400 && response.status < 500 ? 409 : 502,
      "MERCADOPAGO_CHECKOUT_FAILED",
      response.status,
    );
  }
  return payload;
}

export async function findMercadoPagoCheckoutPayment(
  accessToken: string,
  externalReference: string,
) {
  const query = new URLSearchParams({
    external_reference: externalReference,
    sort: "date_created",
    criteria: "desc",
    limit: "10",
  });
  const response = await fetch(`https://api.mercadopago.com/v1/payments/search?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as {
    results?: MercadoPagoCheckoutPayment[];
  } | null;
  if (!response.ok) {
    throw new PosPaymentError(
      providerErrorMessage(payload, response.status),
      response.status >= 400 && response.status < 500 ? 409 : 502,
      "MERCADOPAGO_CHECKOUT_LOOKUP_FAILED",
      response.status,
    );
  }
  return payload?.results?.[0] ?? null;
}

function mapCheckoutPaymentStatus(status?: string): PosPaymentStatus {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "cancelled":
    case "cancelled_by_user":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

export async function syncPosPaymentFromCheckout(
  paymentId: string,
  providerPayment: MercadoPagoCheckoutPayment | null,
) {
  const payment = await prisma.posPayment.findUnique({
    where: { id: paymentId },
    include: { business: { select: { mpUserId: true } } },
  });
  if (!payment) throw new PosPaymentError("Cobro no encontrado", 404, "POS_PAYMENT_NOT_FOUND");

  if (!providerPayment) {
    if (payment.expiresAt && payment.expiresAt.getTime() <= Date.now()) {
      return prisma.posPayment.update({
        where: { id: payment.id },
        data: { status: "EXPIRED", statusDetail: "checkout_expired", lastSyncedAt: new Date() },
      });
    }
    return payment;
  }

  const matches =
    providerPayment.external_reference === payment.externalReference &&
    Number(providerPayment.transaction_amount) === payment.amount &&
    providerPayment.currency_id === payment.currency &&
    (!payment.business.mpUserId || String(providerPayment.collector_id) === payment.business.mpUserId);
  if (!matches) {
    throw new PosPaymentError(
      "El pago recibido no coincide con el cobro registrado",
      409,
      "MERCADOPAGO_CHECKOUT_MISMATCH",
    );
  }

  const status = mapCheckoutPaymentStatus(providerPayment.status);
  return prisma.posPayment.update({
    where: { id: payment.id },
    data: {
      status,
      statusDetail: providerPayment.status_detail ?? providerPayment.status ?? "checkout_pending",
      providerPaymentId: providerPayment.id == null ? payment.providerPaymentId : String(providerPayment.id),
      providerUserId: providerPayment.collector_id == null
        ? payment.providerUserId
        : String(providerPayment.collector_id),
      paidAt: status === "APPROVED" ? payment.paidAt ?? new Date() : payment.paidAt,
      lastSyncedAt: new Date(),
    },
  });
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
