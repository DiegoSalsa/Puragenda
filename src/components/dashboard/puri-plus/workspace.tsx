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
import { prisma } from "@/server/db/prisma";
import { contactLabEnabled } from "@/server/contact-flow/policy";
import { contactSnapshot } from "@/server/contact-flow/campaigns";
export async function PuriPlusWorkspace({
  searchParams, dashboard = false,
}: {
  searchParams: Promise<{ location?: string }>;
  dashboard?: boolean;
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
        recommendations: (await listGrowthRecommendations(scope)).map(row => dashboard ? { id: row.id, title: row.title, explanation: row.explanation, status: row.status, version: row.version, contentHash: row.contentHash, strategy: row.strategy, expiresAt: row.expiresAt, evidence: row.evidence } : row),
        ...(dashboard ? {} : { budgets: await growthBudgetSnapshot(scope), usage: await growthUsageSummary(scope) }),
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
          Necesitas una prueba vigente o un periodo activo de Puragenda+ y permisos para esta sucursal.
        </p>
      </main>
    );
  }
  return (
    <GrowthLab
      key={initialData.selectedLocationSlug ?? "all"}
      initialData={initialData}
      dashboard={dashboard}
    />
  );
}
