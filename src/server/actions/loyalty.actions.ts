"use server";

import { prisma } from "@/server/db/prisma";
import crypto from "crypto";

/**
 * Procesa los timbres de fidelización cuando una cita pasa a COMPLETED.
 *
 * Lógica:
 * 1. Verifica que el negocio tenga isLoyaltyEnabled === true
 * 2. Encuentra al Client asociado a la reserva
 * 3. Incrementa currentStamps en +1
 * 4. Si currentStamps >= stampsRequired → genera LoyaltyCode y resetea stamps
 *
 * Todo dentro de prisma.$transaction para evitar race conditions.
 */
export async function processLoyaltyStamps(appointmentId: string) {
  // Fetch the appointment with business and client data
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: {
        select: {
          id: true,
          isLoyaltyEnabled: true,
          stampsRequired: true,
          rewardName: true,
          discountType: true,
          discountValue: true,
        },
      },
      client: {
        select: {
          id: true,
          email: true,
          currentStamps: true,
        },
      },
    },
  });

  if (!appointment) return;

  const { business, client } = appointment;

  // Guard: loyalty must be enabled
  if (!business.isLoyaltyEnabled) return;

  // Guard: appointment must have an associated client
  if (!client) return;

  // Guard: business must have discount configured
  if (!business.discountType || !business.discountValue) return;

  // All-or-nothing inside a transaction
  await prisma.$transaction(async (tx) => {
    // Step 1: Increment stamps
    const newStamps = client.currentStamps + 1;

    // Step 2: Check if the client reached the reward threshold
    if (newStamps >= business.stampsRequired) {
      // Generate unique reward code: PREMIO-XXXXXX
      const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
      const code = `PREMIO-${randomHex}`;

      // Create the loyalty code record
      await tx.loyaltyCode.create({
        data: {
          code,
          clientId: client.id,
          businessId: business.id,
          discountType: business.discountType!,
          discountValue: business.discountValue!,
          rewardName: business.rewardName,
        },
      });

      // Reset stamps to 0
      await tx.client.update({
        where: { id: client.id },
        data: { currentStamps: 0 },
      });

      // TODO: Disparar email de Resend con el código ganador al customer.email
      // Ejemplo:
      // await sendLoyaltyRewardEmail({
      //   to: client.email,
      //   code,
      //   rewardName: business.rewardName,
      //   discountType: business.discountType,
      //   discountValue: business.discountValue,
      // });
    } else {
      // Just increment the stamp count
      await tx.client.update({
        where: { id: client.id },
        data: { currentStamps: newStamps },
      });
    }
  });
}
