import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";
import { executePuriTool } from "@/server/puri/tools";
import { appointmentScope, requireAgenda } from "@/server/puri/context";
import { loadBookingContext, toBookingCatalog, getBookingAvailability } from "@/server/booking/read.service";
import { authorizedContext, requireBusinessWide, type McpIdentity } from "./access";
import type { McpScope } from "./config";
import { McpError } from "./security";

export const id = z.string().min(1).max(100);
export const period = z.enum(["today", "tomorrow", "yesterday", "this_week", "next_week", "previous_week", "this_month", "previous_month"]);
export const location = { locationId: id.optional() };
export const availabilityShape = { date: z.string().date(), serviceId: id, staffId: id.optional(), locationId: id.optional(), firstAvailable: z.boolean().optional(), selectedOptionAlternativeIds: z.array(id).max(50).default([]) };
export type ReadTool = { name: string; description: string; scope: McpScope; schema: z.ZodObject; run: (args: Record<string, unknown>, identity: McpIdentity | null) => Promise<unknown>; profile?: boolean };

function puri(name: string, description: string, scope: McpScope, puriName: string, shape: z.ZodRawShape = {}, businessWide = false): ReadTool {
  return { name, description, scope, schema: z.object({ ...shape, ...location }).strict(), async run(args, identity) {
    const { locationId, ...input } = args;
    const context = await authorizedContext(identity, scope, locationId as string | undefined);
    if (businessWide) requireBusinessWide(context);
    // OAuth scopes and internal permissions must both allow financial data.
    if (!identity!.scopes.includes("analytics:read")) context.permissions = context.permissions.filter((p) => p !== P.ANALYTICS_VIEW_OWN && p !== P.ANALYTICS_VIEW_BUSINESS);
    const result = await executePuriTool(puriName, name === "get_client_activity" ? { ...input, days: 90 } : input, context);
    if (name === "get_loyalty_summary" && !identity!.scopes.includes("clients:read")) {
      const aggregate = { ...(result as Record<string, unknown>) };
      delete aggregate.nearReward;
      return aggregate;
    }
    if (name === "get_client_summary" && !identity!.scopes.includes("loyalty:read")) {
      const client = { ...(result as Record<string, unknown>) };
      delete client.currentStamps;
      return client;
    }
    if (name === "search_clients" && !identity!.scopes.includes("loyalty:read")) {
      const data = result as { clients: Array<Record<string, unknown>> };
      return { clients: data.clients.map((client) => { const safe = { ...client }; delete safe.currentStamps; return safe; }) };
    }
    return result;
  } };
}

export const readTools: ReadTool[] = [
  { name: "get_connected_account", description: "Identifica la cuenta y el negocio autorizados por esta conexión. No recibe IDs de negocio.", scope: "account:read", profile: true, schema: z.object({}).strict(), async run(_args, identity) {
    const context = await authorizedContext(identity, "account:read");
    return { id: identity!.connection.profile.id, name: context.access.user.name,
      nickname: context.business.name };
  } },
  { name: "get_business_profile", description: "Consulta nombre, zona horaria y moneda del negocio conectado.", scope: "account:read", schema: z.object({}).strict(), async run(_args, identity) {
    const c = await authorizedContext(identity, "account:read");
    return { id: c.business.id, name: c.business.name, timezone: c.business.timezone, currency: c.business.currencyCode };
  } },
  { name: "list_accessible_locations", description: "Lista únicamente las sucursales activas autorizadas para esta cuenta.", scope: "account:read", schema: z.object({}).strict(), async run(_args, identity) {
    const c = await authorizedContext(identity, "account:read"); return { locations: c.access.locations };
  } },
  puri("get_today_overview", "Consulta el resumen de hoy en la zona horaria de la sucursal. Diferencia cobrado, pendiente y proyectado cuando están autorizados.", "agenda:read", "getTodayOverview"),
  puri("list_appointments", "Lista hasta 50 citas del período en la sucursal y agenda permitidas. Usa nextCursor como cursor para la siguiente página. No calcula disponibilidad.", "agenda:read", "getAppointments", { period, cursor: id.optional(), status: z.enum(["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "CANCELLED", "CHECKED_IN", "COMPLETED", "NO_SHOW"]).optional() }),
  { name: "get_appointment_details", description: "Consulta fecha, servicio, profesional y estado de una cita autorizada, sin notas, datos clínicos ni credenciales.", scope: "agenda:read", schema: z.object({ appointmentId: id, ...location }).strict(), async run(args, identity) {
    const c = await authorizedContext(identity, "agenda:read", args.locationId as string | undefined); requireAgenda(c);
    const row = await prisma.appointment.findFirst({ where: { id: args.appointmentId as string, businessId: c.business.id,
      AND: [appointmentScope(c), { OR: [{ locationId: c.location!.id }, ...(c.location!.isPrimary ? [{ locationId: null }] : [])] }] },
      select: { id: true, customerName: true, startTime: true, endTime: true, status: true, service: { select: { id: true, name: true } }, staff: { select: { id: true, name: true } } } });
    if (!row) throw new McpError("APPOINTMENT_NOT_FOUND", 404);
    return { ...row, timezone: c.location!.timezone, currency: c.business.currencyCode };
  } },
  { name: "get_available_slots", description: "Calcula horarios reales del motor de reservas v1, entre hoy y 90 días. Una lista vacía significa que no hay disponibilidad.", scope: "agenda:read", schema: z.object(availabilityShape).strict(), async run(args, identity) {
    const parsed = z.object(availabilityShape).parse(args);
    const c = await authorizedContext(identity, "agenda:read", parsed.locationId); requireAgenda(c);
    if (c.ownAgenda && (!c.staffId || parsed.firstAvailable || (parsed.staffId && parsed.staffId !== c.staffId))) throw new McpError("STAFF_FORBIDDEN");
    return getBookingAvailability(await loadBookingContext(c.business.id), { ...parsed, locationId: c.location!.id, staffId: c.ownAgenda ? c.staffId! : parsed.staffId });
  } },
  ...["list_services", "list_staff"].map((name): ReadTool => ({ name, description: name === "list_services" ? "Lista servicios de citas publicados en la sucursal, con precios y opciones del catálogo canónico." : "Lista profesionales habilitados de la sucursal; una cuenta con agenda propia sólo ve su profesional.", scope: "agenda:read", schema: z.object(location).strict(), async run(args, identity) {
    const c = await authorizedContext(identity, "agenda:read", args.locationId as string | undefined); requireAgenda(c);
    const catalog = toBookingCatalog(await loadBookingContext(c.business.id));
    const locationId = c.location!.id;
    const services = catalog.services.filter((s) => s.locationIds.includes(locationId)).map((s) => ({ ...s, locationIds: [locationId] }));
    const serviceIds = new Set(services.map((s) => s.id));
    return name === "list_services" ? { services, currency: c.business.currencyCode }
      : { staff: catalog.staff.filter((s) => s.locationIds.includes(locationId) && (!c.ownAgenda || s.id === c.staffId))
        .map((s) => ({ ...s, locationIds: [locationId], serviceIds: s.serviceIds.filter((id) => serviceIds.has(id)) })) };
  } })),
  puri("search_clients", "Busca hasta 10 clientes por nombre, email o teléfono. Requiere acceso al CRM de todo el negocio; excluye notas privadas.", "clients:read", "searchClients", { query: z.string().trim().min(2).max(100) }, true),
  puri("get_client_summary", "Consulta visitas y actividad no sensible de un cliente del negocio autorizado. Importes sólo con permiso financiero y scope adicional.", "clients:read", "getClientSummary", { clientId: id }, true),
  puri("get_client_activity", "Resume hasta 10 clientes frecuentes, inactivos o con ausencias durante los últimos 90 días, dentro del negocio autorizado. Requiere acceso global al CRM.", "clients:read", "getClientActivity", { sort: z.enum(["frequent", "inactive", "no_show"]) }, true),
  puri("get_revenue_summary", "Calcula cobrado, pendiente y valor de citas del período; se agrupa por fecha de cita, no por fecha contable de pago. No es un libro de facturación.", "analytics:read", "getRevenueSummary", { period }),
  puri("compare_periods", "Compara cobros y citas de dos períodos calculados por Puragenda en la sucursal y agenda autorizadas.", "analytics:read", "comparePeriods", { current: period, previous: period }),
  puri("get_popular_services", "Resume reservas por servicio y valor reservado del período. El valor reservado no equivale a dinero cobrado.", "analytics:read", "getServicesSummary", { period }),
  puri("get_staff_performance", "Resume citas y valor reservado por profesional de la sucursal. Requiere permiso de agenda global y finanzas del negocio.", "analytics:read", "getStaffSummary", { period }),
  puri("get_loyalty_summary", "Resume sellos y recompensas del negocio. Nombres de clientes sólo si también se autorizó clients:read.", "loyalty:read", "getLoyaltySummary", {}, true),
  puri("get_gift_cards_summary", "Resume cantidades y saldos de gift cards por moneda. No devuelve códigos ni permite comprar o canjear tarjetas.", "loyalty:read", "getGiftCardsSummary", {}, true),
];
