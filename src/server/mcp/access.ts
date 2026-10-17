import type { McpConnection, McpProfile } from "@prisma/client";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";
import { hasOperationalSubscriptionAccess } from "@/core/subscription-access";
import { prisma } from "@/server/db/prisma";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import type { PuriContext } from "@/server/puri/types";
import { digest, McpError } from "./security";
import { mcpConfig, type McpScope } from "./config";

export async function membership(userId: string, businessId: string, tokenVersion?: number) {
  const [user, business, staff] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.business.findUnique({ where: { id: businessId }, include: { subscription: true } }),
    prisma.staff.findFirst({ where: { businessId, userId, isActive: true }, select: { id: true } }),
  ]);
  if (!user || user.deletedAt || (tokenVersion !== undefined && user.tokenVersion !== tokenVersion)
    || !business || (business.ownerId !== user.id && !staff)) throw new McpError("ACCESS_REVOKED", 401);
  if (!hasOperationalSubscriptionAccess(business.subscription)) throw new McpError("SUBSCRIPTION_INACTIVE");
  const permissions = await getEffectiveBusinessPermissions(user, business);
  const owner = business.ownerId === user.id;
  // Internal role fallbacks never establish membership. Branch assignments are
  // enforced even for employees with view_all or a legacy ADMIN role.
  const locations = await prisma.businessLocation.findMany({
    where: { businessId, isActive: true, ...(!owner ? { staff: { some: { staffId: staff!.id, isActive: true } } } : {}) },
    select: { id: true, slug: true, name: true, timezone: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
  });
  return { user, business, staffId: staff?.id ?? null, permissions, locations, owner };
}

export type McpIdentity = { connection: McpConnection & { profile: McpProfile }; scopes: string[] };
export async function authenticateBearer(header: string | null): Promise<McpIdentity | null> {
  if (!header) return null;
  if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(header)) throw new McpError("INVALID_TOKEN", 401);
  const token = await prisma.mcpOAuthToken.findUnique({ where: { accessHash: digest(header.slice(7)) }, include: { connection: { include: { profile: true } } } });
  const { issuer, resource } = mcpConfig();
  if (!token || token.accessExpiresAt <= new Date() || token.issuer !== issuer || token.resource !== resource
    || token.connection.revokedAt || token.connection.expiresAt <= new Date()) throw new McpError("INVALID_TOKEN", 401);
  await membership(token.connection.profile.userId, token.connection.profile.businessId, token.connection.tokenVersion);
  return { connection: token.connection, scopes: token.scopes };
}

export async function authorizedContext(identity: McpIdentity | null, scope: McpScope, locationId?: string): Promise<PuriContext & { identity: McpIdentity; access: Awaited<ReturnType<typeof membership>> }> {
  if (!identity) throw new McpError("AUTHENTICATION_REQUIRED", 401);
  if (!identity.scopes.includes(scope)) throw new McpError("INSUFFICIENT_SCOPE");
  // Re-read revocation for every tool, including calls on long-lived transports.
  const current = await prisma.mcpConnection.findUnique({ where: { id: identity.connection.id } });
  if (!current || current.revokedAt || current.expiresAt <= new Date()) throw new McpError("ACCESS_REVOKED", 401);
  const access = await membership(identity.connection.profile.userId, identity.connection.profile.businessId, current.tokenVersion);
  const location = locationId ? access.locations.find((item) => item.id === locationId) : access.locations[0];
  if (!location) throw new McpError("LOCATION_FORBIDDEN");
  const canSeeAllAgendas = access.permissions.includes(P.APPOINTMENTS_VIEW_ALL);
  return { user: access.user, business: access.business, staffId: access.staffId, permissions: access.permissions,
    canSeeAllAgendas, ownAgenda: !canSeeAllAgendas, location, locationCount: Math.max(2, access.locations.length),
    pathname: "/dashboard", locale: "es", selectedPeriod: "week", identity, access };
}

export function requireBusinessWide(context: Awaited<ReturnType<typeof authorizedContext>>) {
  // Existing CRM and loyalty aggregates cover all branches. Deny them to
  // branch-restricted users until the canonical aggregate supports that filter.
  if (!context.access.owner) throw new McpError("BUSINESS_WIDE_ACCESS_REQUIRED");
}
export function requireWrite(context: PuriContext, staffId?: string | null) {
  if (context.permissions.includes(P.APPOINTMENTS_MANAGE_ALL)) return;
  if (!context.permissions.includes(P.APPOINTMENTS_MANAGE_OWN) || !staffId || context.staffId !== staffId) throw new McpError("FORBIDDEN");
}
