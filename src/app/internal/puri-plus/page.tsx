import { notFound, redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { createPuriContext } from "@/server/puri/context";
import {
  createGrowthScope,
  growthSandboxEnabled,
} from "@/server/puri/growth/access";
import { listGrowthSignals } from "@/server/puri/growth/analysis";
import { listGrowthRecommendations } from "@/server/puri/growth/recommendations";
import {
  growthBudgetSnapshot,
  growthUsageSummary,
} from "@/server/puri/growth/budgets";
import { GrowthLab, type GrowthLabData } from "./growth-lab";
import { PuriAccessError } from "@/server/puri/types";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/crawler-policy";
import { prisma } from "@/server/db/prisma";
import { contactLabEnabled } from "@/server/contact-flow/policy";
import { contactSnapshot } from "@/server/contact-flow/campaigns";
export const metadata = {
  title: "Puri+ · prueba interna",
  robots: { ...PRIVATE_PAGE_ROBOTS, googleBot: PRIVATE_PAGE_ROBOTS },
};
export const dynamic = "force-dynamic";
export default async function PuriPlusLab({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  if (!growthSandboxEnabled()) notFound();
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  let initialData: GrowthLabData;
  try {
    const selected = (await searchParams).location;
    const context = await createPuriContext(user, {
      pathname: "/internal/puri-plus",
      locale: "es",
      locationSlug: selected,
    });
    if (!selected && context.business.ownerId !== user.id) {
      context.location = await prisma.businessLocation.findFirst({
        where: {
          businessId: context.business.id,
          isActive: true,
          staff: {
            some: {
              isActive: true,
              staff: {
                userId: user.id,
                businessId: context.business.id,
                isActive: true,
              },
            },
          },
        },
        select: {
          id: true,
          slug: true,
          name: true,
          timezone: true,
          isPrimary: true,
        },
        orderBy: { id: "asc" },
      });
    }
    const scope = await createGrowthScope(context);
    const locations = await prisma.businessLocation.findMany({
      where: {
        businessId: scope.businessId,
        isActive: true,
        ...(!scope.owner
          ? {
              staff: {
                some: {
                  isActive: true,
                  staff: {
                    userId: user.id,
                    businessId: scope.businessId,
                    isActive: true,
                  },
                },
              },
            }
          : {}),
      },
      select: { slug: true, name: true },
      orderBy: { position: "asc" },
      take: 10,
    });
    initialData = JSON.parse(
      JSON.stringify({
        contactFlowEnabled:
          contactLabEnabled() && scope.canPrepare && scope.canClients,
        contactFlowOwner: scope.owner,
        contactFlowSnapshot:
          contactLabEnabled() && scope.canPrepare && scope.canClients
            ? await contactSnapshot(scope)
            : undefined,
        signals: await listGrowthSignals(scope),
        recommendations: await listGrowthRecommendations(scope),
        budgets: await growthBudgetSnapshot(scope),
        usage: await growthUsageSummary(scope),
        locations,
        selectedLocationSlug: context.location?.slug,
        capabilities: { canPrepare: scope.canPrepare },
        scope: {
          location: context.location?.name ?? "Todas las sucursales",
          timezone: scope.timezone,
        },
      }),
    ) as GrowthLabData;
  } catch (error) {
    if (!(error instanceof PuriAccessError)) throw error;
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Puri+ requiere acceso autorizado</h1>
        <p className="mt-4">
          Necesitas Puragenda+ con pago confirmado y permisos efectivos para
          esta sucursal.
        </p>
      </main>
    );
  }
  return (
    <GrowthLab
      key={initialData.selectedLocationSlug ?? "all"}
      initialData={initialData}
    />
  );
}
