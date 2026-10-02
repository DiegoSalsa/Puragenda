import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireWebsiteManager } from "@/server/websites/service";
import { fetchWebsitePreapproval, syncMercadoPagoWebsiteInvoice, syncMercadoPagoWebsitePreapproval, websiteBillingSimulatorEnabled } from "@/server/websites/mercadopago-billing";
const input = z.object({ operation: z.string().uuid(), action: z.enum(["authorized", "approved", "pending", "rejected", "cancelled", "past_due"]) });
export async function POST(request: NextRequest) {
  if (!websiteBillingSimulatorEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origin" }, { status: 403 });
  try {
    const { business } = await requireWebsiteManager(true);
    const data = input.parse(await request.json());
    const op = await prisma.websiteCheckoutOperation.findFirst({ where: { id: data.operation, addon: { businessId: business.id } } });
    if (!op?.mpSubscriptionId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const agreement = data.action === "cancelled" ? "cancelled" : data.action === "pending" ? "pending" : "authorized";
    await prisma.websiteCheckoutOperation.update({ where: { id: op.id }, data: { providerStatus: agreement } });
    await syncMercadoPagoWebsitePreapproval(await fetchWebsitePreapproval(op.mpSubscriptionId));
    if (["approved", "pending", "rejected", "past_due"].includes(data.action)) {
      const now = new Date();
      await syncMercadoPagoWebsiteInvoice({ id: `simulated-${op.id}-${data.action}`, preapproval_id: op.mpSubscriptionId, transaction_amount: op.amount, currency_id: op.currency, debit_date: now.toISOString(), last_modified: now.toISOString(), payment: { id: `simulated-payment-${op.id}`, status: data.action === "past_due" ? "rejected" : data.action } });
    }
    return NextResponse.json({ mode: "PASS_SIMULATED", action: data.action });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Simulation failed" }, { status: 400 }); }
}
