import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { OrdersBoard } from "./orders-board";
import Link from "next/link";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { hasBusinessPermission } from "@/server/services/permissions.service";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">Debes iniciar sesion</div>;
  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">Negocio no encontrado</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.SERVICES_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para gestionar encargos.</div>;
  }
  if (!business.productionOrdersEnabled) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-border p-10 text-center">
        <h1 className="text-xl font-bold">Encargos no está activo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta cuenta usa solo la agenda de citas. Puedes habilitar el módulo cuando lo necesites.
        </p>
        <Link href="/dashboard/settings#encargos" className="mt-5 inline-flex rounded-xl bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white">
          Ir a Configuración
        </Link>
      </div>
    );
  }

  const orders = await prisma.productionOrder.findMany({
    where: { businessId: business.id },
    include: { service: { select: { name: true } } },
    orderBy: [{ productionWeek: "asc" }, { createdAt: "desc" }],
  });

  return (
    <OrdersBoard
      businessName={business.name}
      initialOrders={orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        petName: order.petName,
        petDetails: order.petDetails,
        referenceImageUrls: order.referenceImageUrls,
        productionWeek: order.productionWeek.toISOString().slice(0, 10),
        productionWindowLabel: order.productionWindowLabel,
        productionWindowEnd: order.productionWindowEnd?.toISOString().slice(0, 10) ?? null,
        selectedOptions: (order.selectedOptions as { categoryName: string; alternativeName: string; priceDelta: number }[] | null) ?? [],
        totalPrice: order.totalPrice,
        depositAmount: order.depositAmount,
        balanceAmount: order.balanceAmount,
        depositPaymentStatus: order.depositPaymentStatus,
        balancePaymentStatus: order.balancePaymentStatus,
        deliveryMethod: order.deliveryMethod,
        customerAddress: order.customerAddress,
        status: order.status,
        internalNotes: order.internalNotes,
        createdAt: order.createdAt.toISOString(),
        serviceName: order.service.name,
      }))}
    />
  );
}
