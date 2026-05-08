import { createAuditLog } from "@/server/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/server/auth/session";

export async function DELETE(request: NextRequest) {
  try {
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json({ error: "No tienes un negocio asociado" }, { status: 404 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
    });

    // Only allow cancellation if the subscription is pending payment (INACTIVE)
    if (subscription && subscription.status !== "INACTIVE") {
      return NextResponse.json(
        { error: "No puedes cancelar una cuenta que ya estÃ¡ activa. Ve a configuraciÃ³n." },
        { status: 400 }
      );
    }

        // Perform cascade delete safely in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark subscription as CANCELLED
      await tx.subscription.updateMany({
        where: { businessId: business.id },
        data: { status: "CANCELLED" }
      });

      // 2. Mark the Business as deleted
      await tx.business.update({
        where: { id: business.id },
        data: { deletedAt: new Date() }
      });

      // 3. Mark the User as deleted
      await tx.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() }
      });
    });

    // Delete session cookie
    (await cookies()).delete(AUTH_COOKIE_NAME);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[auth/cancel-registration] Error:", error);
    return NextResponse.json(
      { error: "Error interno al intentar cancelar el registro." },
      { status: 500 }
    );
  }
}
