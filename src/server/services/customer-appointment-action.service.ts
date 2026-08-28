import crypto from "node:crypto";
import { prisma } from "@/server/db/prisma";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

function customerAppointmentTokenSecret() {
  const secret = process.env.CUSTOMER_APPOINTMENT_TOKEN_SECRET
    ?? process.env.AUTH_SECRET
    ?? process.env.NEXTAUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CUSTOMER_APPOINTMENT_TOKEN_SECRET or AUTH_SECRET must be configured in production");
  }
  return "dev-only-customer-appointment-token-secret";
}

export function hashCustomerAppointmentToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueCustomerAppointmentToken(
  appointmentId: string,
  expiresAt: Date,
) {
  if (expiresAt <= new Date()) return null;

  // Retries of the same confirmation email must produce the exact same
  // payload for Resend's idempotency key. This HMAC remains unguessable and
  // changes whenever the appointment time (and therefore expiry) changes.
  const token = crypto
    .createHmac("sha256", customerAppointmentTokenSecret())
    .update(`customer-appointment-action:${appointmentId}:${expiresAt.toISOString()}`)
    .digest("hex");
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      customerActionTokenHash: hashCustomerAppointmentToken(token),
      customerActionTokenExpiresAt: expiresAt,
      customerActionTokenUsedAt: null,
    },
  });
  return token;
}

export async function getCustomerAppointmentByToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;

  const appointment = await prisma.appointment.findUnique({
    where: { customerActionTokenHash: hashCustomerAppointmentToken(token) },
    include: {
      service: true,
      staff: true,
      business: {
        include: {
          owner: { select: { email: true, name: true } },
          subscription: { select: { plan: true } },
        },
      },
    },
  });

  if (
    !appointment ||
    appointment.customerActionTokenUsedAt ||
    !appointment.customerActionTokenExpiresAt ||
    appointment.customerActionTokenExpiresAt <= new Date()
  ) {
    return null;
  }

  return appointment;
}
