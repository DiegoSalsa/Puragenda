import crypto from "node:crypto";
import { prisma } from "@/server/db/prisma";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function hashCustomerAppointmentToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueCustomerAppointmentToken(
  appointmentId: string,
  expiresAt: Date,
) {
  if (expiresAt <= new Date()) return null;

  const token = crypto.randomBytes(32).toString("hex");
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
        include: { owner: { select: { email: true, name: true } } },
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
