import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { isRegistrationV2Contract } from "@/server/services/commercial-plan-access";
import { getStaffLimit } from "@/core/subscription-plan";
import { COMMERCIAL_CATALOG_VERSION, quoteCommercialContract } from "@/core/commercial-catalog";
import { contractedProfessionalsLabel } from "@/core/commercial-display";
import { CommercialSubscriptionPanel } from "@/components/dashboard/commercial-subscription-panel";
import {LegacyPlusSubscriptionPanel} from "@/components/dashboard/legacy-plus-subscription-panel";
import {legacyPlusTerms} from "@/core/legacy-plus";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login");
  const business = await getBusinessForUser(user.id);
  if (!business || business.ownerId !== user.id) redirect("/dashboard/settings");
  const [subscription, contract] = await Promise.all([
    prisma.subscription.findUnique({ where: { businessId: business.id } }),
    prisma.commercialSubscription.findUnique({ where: { businessId: business.id } }),
  ]);
  if (!subscription) redirect("/dashboard/settings");
  if (subscription.plan === "PURAGENDA_PLUS" || contract?.planCode === "PURAGENDA_PLUS" && !legacyPlusTerms(contract.termsSnapshot)) redirect("/dashboard/settings#plan");
  const professionalTotal = contract?.professionalTotal ?? getStaffLimit(subscription);
  const billingCycle = contract?.billingCycle ?? subscription.billingCycle;
  const quote = quoteCommercialContract({ plan: "PURAGENDA_PLUS", professionalTotal, billingCycle, catalogVersion: COMMERCIAL_CATALOG_VERSION });
  const supported = isRegistrationV2Contract(contract);
  return <section className="mx-auto max-w-2xl space-y-5 pb-8">
    <Link href="/dashboard/settings#plan" className="text-sm font-semibold underline">Volver a mi plan</Link>
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h1 className="text-2xl font-bold">Contratar Puragenda+</h1>
      <p>{business.name} · {contractedProfessionalsLabel(professionalTotal)}</p>
      <p className="text-3xl font-bold">${quote.cycleTotal.toLocaleString("es-CL")} <span className="text-base font-medium">CLP/{billingCycle === "ANNUAL" ? "año" : "mes"}</span></p>
      <p className="text-sm text-muted-foreground">IVA incluido. Incluye tu agenda, sitio web, Puri+ y Contact Flow. Conservas los profesionales contratados.</p>
      {supported ? <CommercialSubscriptionPanel upgradeToPlus /> : <LegacyPlusSubscriptionPanel />}
    </div>
  </section>;
}
