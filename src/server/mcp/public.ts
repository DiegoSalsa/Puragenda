import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { prisma } from "@/server/db/prisma";
import { loadBookingContext, toBookingCatalog, getBookingAvailability, type AvailabilityQuery } from "@/server/booking/read.service";
import { McpError, limit } from "./security";
import { publicBookingEnabled } from "./config";
import { mcpBusinessFilter } from "./rollout";

export async function publicBusiness(slug: string) {
  const business = await prisma.business.findFirst({ where: { ...await mcpBusinessFilter(), slug, mcpPublicDiscovery: true }, include: { subscription: true } });
  if (!business || !hasOperationalSubscriptionAccess(business.subscription)) throw new McpError("BUSINESS_NOT_FOUND", 404);
  return business;
}
export async function searchPublicBusinesses(query: string, cursor?: string) {
  const rows = await prisma.business.findMany({ where: { AND: [await mcpBusinessFilter(), ...(cursor ? [{ id: { gt: cursor } }] : [])], mcpPublicDiscovery: true, name: { contains: query, mode: "insensitive" } },
    select: { id: true, slug: true, name: true, timezone: true, currencyCode: true, subscription: { select: { plan: true, currentPeriodEnd: true, status: true, isTrial: true, trialEndsAt: true, gracePeriodEndsAt: true } } }, orderBy: { id: "asc" }, take: 21 });
  return { businesses: rows.slice(0, 20).filter((row) => hasOperationalSubscriptionAccess(row.subscription)).map(({ id, slug, name, timezone, currencyCode }) => ({ id, slug, name, timezone, currencyCode })),
    nextCursor: rows.length > 20 ? rows[19].id : null };
}
export async function publicCatalog(slug: string) {
  const business = await publicBusiness(slug);
  const catalog = toBookingCatalog(await loadBookingContext(business.id));
  // Public transactions are restricted to services that are entirely free.
  // Never return a checkout/payment URL or sell Puragenda plans through MCP.
  return { ...catalog, capabilities: { ...catalog.capabilities, mcpBooking: publicBookingEnabled() && !business.depositRequired, paidBooking: false },
    services: catalog.services.map((service) => ({ ...service, mcpBookable: publicBookingEnabled() && !business.depositRequired && service.price === 0 && !service.depositAmount && service.optionCategories.every((category) => category.alternatives.every((a) => a.priceDelta === 0)) })) };
}
export async function publicAvailability(slug: string, query: AvailabilityQuery) {
  const business = await publicBusiness(slug);
  await limit(`public-availability:business:${business.id}`, 60);
  return getBookingAvailability(await loadBookingContext(business.id), query);
}
