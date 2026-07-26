import { prisma } from "@/server/db/prisma";
import { headers } from "next/headers";

/**
 * Creates an immutable audit log entry for critical actions (WORM compliance).
 * 
 * @param action - The name of the action performed (e.g. "USER_LOGIN", "STAFF_DELETED")
 * @param details - Optional JSON object with details about the action
 * @param userId - Optional ID of the user performing the action
 */
export async function createAuditLog(
  action: string,
  details?: Record<string, unknown>,
  userId?: string
) {
  try {
    // Get IP address from headers if available
    const headerStore = await headers();
    const ipAddress =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      "unknown";

    await prisma.auditLog.create({
      data: {
        action,
        userId: userId || null,
        ipAddress,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    // Audit log failures should not crash the main transaction, but must be logged
    console.error("[AuditLog] Failed to create audit log:", error);
  }
}
