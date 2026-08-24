import { Percent } from "@/components/icons/hover-icons";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { hasBusinessPermission } from "@/server/services/permissions.service";
import { DASHBOARD_PERMISSIONS } from "@/core/permissions";
import { prisma } from "@/server/db/prisma";
import { DiscountCodesClient } from "./discounts-client";

export const dynamic = "force-dynamic";

export default async function BookingDiscountsPage() {
  const user = await getCurrentSessionUser();
  if (!user) return <div className="py-20 text-center text-muted-foreground">No autenticado</div>;
  const business = await getBusinessForUser(user.id);
  if (!business) return <div className="py-20 text-center text-muted-foreground">No tienes un negocio</div>;
  if (!(await hasBusinessPermission(user, business, DASHBOARD_PERMISSIONS.MARKETING_MANAGE))) {
    return <div className="py-20 text-center text-muted-foreground">No tienes permisos para administrar descuentos</div>;
  }

  const codes = await prisma.bookingDiscountCode.findMany({
    where: { businessId: business.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <Percent className="h-5 w-5 text-[#7C3AED]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Códigos de reserva</h1>
          <p className="text-sm text-muted-foreground">Descuentos independientes de banners y premios de fidelización.</p>
        </div>
      </div>
      <DiscountCodesClient
        currencyCode={business.currencyCode}
        codes={codes.map((code) => ({
          id: code.id,
          code: code.code,
          discountType: code.discountType,
          discountValue: code.discountValue,
          minSubtotal: code.minSubtotal,
          startsAt: code.startsAt?.toISOString() ?? null,
          expiresAt: code.expiresAt?.toISOString() ?? null,
          isActive: code.isActive,
        }))}
      />
    </div>
  );
}
