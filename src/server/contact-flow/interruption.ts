import type { Prisma } from "@prisma/client";
import { settleContactQuota } from "./quotas";
// Stopping future execution cannot erase a possibly accepted past attempt.
// A durable receipt proves acceptance; otherwise STARTED/UNKNOWN remains unknown.
export async function settleInterruptedDelivery(
  tx: Prisma.TransactionClient,
  messageId: string,
  now: Date,
) {
  const receipt = await tx.cfSimulatedReceipt.findUnique({
    where: { messageId },
  });
  const ambiguous =
    !receipt &&
    (await tx.cfAttempt.findFirst({
      where: { messageId, outcome: { in: ["STARTED", "UNKNOWN"] } },
      select: { id: true },
    }));
  if (!receipt && !ambiguous) return null;
  const state = receipt ? "ACCEPTED" : "UNKNOWN";
  await tx.cfMessage.update({
    where: { id: messageId },
    data: {
      state,
      ...(receipt
        ? { providerId: receipt.providerId, acceptedAt: receipt.createdAt }
        : {}),
    },
  });
  await settleContactQuota(tx, messageId, "CONSUMED", now);
  return state;
}
