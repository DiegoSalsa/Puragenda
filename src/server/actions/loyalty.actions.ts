"use server";

import { prisma } from "@/server/db/prisma";
import { sendLoyaltyStampEmail, sendLoyaltyRewardEmail } from "@/server/email/send";
import crypto from "crypto";

/**
 * Procesa los timbres de fidelización cuando una cita pasa a COMPLETED.
 *
 * Lógica:
 * 1. Verifica que el negocio tenga isLoyaltyEnabled === true
 * 2. Encuentra al Client asociado a la reserva
 * 3. Incrementa currentStamps en +1
 * 4. Si currentStamps >= stampsRequired → genera LoyaltyCode y resetea stamps
 * 5. Envía email al cliente con progreso o código de premio
 *
 * Todo dentro de prisma.$transaction para evitar race conditions.
 * Los emails se envían DESPUÉS de la transacción (fire-and-forget).
 */
export async function processLoyaltyStamps(appointmentId: string) {
  // Fetch the appointment with business and client data
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      business: {
        select: {
          id: true,
          name: true,
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
          name: true,
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

  // Track what happened inside the transaction for the email
  let emailScenario: "stamp" | "reward" = "stamp" as "stamp" | "reward";
  let newStampCount = 0;
  let generatedCode = "";

  // All-or-nothing inside a transaction
  await prisma.$transaction(async (tx) => {
    // Step 1: Increment stamps
    const newStamps = client.currentStamps + 1;

    // Step 2: Check if the client reached the reward threshold
    if (newStamps >= business.stampsRequired) {
    // Generate unique reward code: PREMIO-XXXXXXXXXX (5 bytes = 1B combinations)
    let code: string = "";
    let attempts = 0;
    do {
      const randomHex = crypto.randomBytes(5).toString("hex").toUpperCase();
      code = `PREMIO-${randomHex}`;
      const exists = await prisma.loyaltyCode.findFirst({ where: { code } });
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

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

      emailScenario = "reward";
      generatedCode = code;
    } else {
      // Just increment the stamp count
      await tx.client.update({
        where: { id: client.id },
        data: { currentStamps: newStamps },
      });

      emailScenario = "stamp";
      newStampCount = newStamps;
    }
  });

  // ── Send emails AFTER the transaction succeeds (fire-and-forget) ──

  const rewardName = business.rewardName || "Premio de fidelización";

  if (emailScenario === "reward") {
    sendLoyaltyRewardEmail({
      clientEmail: client.email,
      clientName: client.name,
      stampsRequired: business.stampsRequired,
      rewardName,
      rewardCode: generatedCode,
      discountType: business.discountType!,
      discountValue: business.discountValue!,
      businessName: business.name,
      clientId: client.id,
    }).catch((err) => console.error("[Loyalty] Error sending reward email:", err));
  } else {
    sendLoyaltyStampEmail({
      clientEmail: client.email,
      clientName: client.name,
      currentStamps: newStampCount,
      stampsRequired: business.stampsRequired,
      rewardName,
      businessName: business.name,
      clientId: client.id,
    }).catch((err) => console.error("[Loyalty] Error sending stamp email:", err));
  }
}
