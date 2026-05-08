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
        { error: "No puedes cancelar una cuenta que ya está activa. Ve a configuración." },
        { status: 400 }
      );
    }

    // Perform cascade delete safely in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete Staff records associated with this user
      await tx.staff.deleteMany({
        where: { userId: user.id },
      });

      // 2. Delete the Subscription
      await tx.subscription.deleteMany({
        where: { businessId: business.id },
      });

      // 3. Delete the Business
      await tx.business.delete({
        where: { id: business.id },
      });

      // 4. Delete the User
      await tx.user.delete({
        where: { id: user.id },
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
