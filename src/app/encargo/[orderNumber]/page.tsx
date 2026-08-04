import { CheckCircle2, Clock3, Package, XCircle } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductionOrderStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { orderNumber } = await params;
  const { payment } = await searchParams;
  const order = await prisma.productionOrder.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      petName: true,
      depositAmount: true,
      balanceAmount: true,
      depositPaymentStatus: true,
      service: { select: { name: true } },
      business: { select: { name: true, primaryColor: true, currencyCode: true } },
    },
  });
  if (!order) return <div className="flex min-h-screen items-center justify-center">Encargo no encontrado</div>;

  const approved = order.depositPaymentStatus === "APPROVED";
  const failed = payment === "failed";
  const Icon = approved ? CheckCircle2 : failed ? XCircle : Clock3;
  const color = approved ? "#10b981" : failed ? "#ef4444" : "#f59e0b";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `${color}18` }}>
          <Icon className="h-10 w-10" style={{ color }} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">{approved ? "Cupo confirmado" : failed ? "No se pudo completar el pago" : "Pago en revisión"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {approved ? `${order.business.name} recibió tu abono y revisará las referencias de ${order.petName}.` : "Puedes volver a intentarlo o coordinar el abono directamente con el negocio."}
        </p>
        <div className="mt-6 rounded-2xl bg-muted/50 p-5 text-left text-sm">
          <p className="mb-3 flex items-center gap-2 font-semibold" style={{ color: order.business.primaryColor }}><Package className="h-4 w-4" />{order.orderNumber}</p>
          <p><span className="text-muted-foreground">Servicio:</span> {order.service.name}</p>
          <p className="mt-1"><span className="text-muted-foreground">Mascota:</span> {order.petName}</p>
          <p className="mt-1"><span className="text-muted-foreground">Abono:</span> {formatPrice(order.depositAmount, order.business.currencyCode)}</p>
          <p className="mt-1"><span className="text-muted-foreground">Saldo al finalizar:</span> {formatPrice(order.balanceAmount, order.business.currencyCode)}</p>
        </div>
      </div>
    </main>
  );
}
