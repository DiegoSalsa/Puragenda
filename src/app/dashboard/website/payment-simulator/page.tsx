import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { requireWebsiteManager } from "@/server/websites/service";
import { websiteBillingSimulatorEnabled } from "@/server/websites/mercadopago-billing";
import Simulator from "./simulator";
export default async function PaymentSimulatorPage({ searchParams }: { searchParams: Promise<{ operation?: string }> }) {
  if (!websiteBillingSimulatorEnabled()) notFound();
  const { business } = await requireWebsiteManager(true);
  const { operation } = await searchParams;
  if (!operation) notFound();
  const op = await prisma.websiteCheckoutOperation.findFirst({ where: { id: operation, addon: { businessId: business.id } } });
  if (!op) notFound();
  return <Simulator operation={op.id} amount={op.amount} firstChargeAt={op.firstChargeAt?.toISOString() ?? null} />;
}
