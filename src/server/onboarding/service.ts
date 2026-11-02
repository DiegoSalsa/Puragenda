import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getBusinessForUser } from "@/server/services/business.service";
import { getEffectiveBusinessPermissions } from "@/server/services/permissions.service";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";
import { getStaffLimitInfo } from "@/server/services/staff-capacity.service";
import { createStaff } from "@/server/services/staff.service";
import { createService } from "@/server/services/service.service";
import { writeBusinessHours } from "@/server/services/business-hours.service";
import { getBookingAvailability, loadBookingContext, toBookingCatalog } from "@/server/booking/read.service";
import { serviceSchema } from "@/server/validations/booking";
import { activationState, canManageSetup, hoursSchema, setupProgress, setupStepSchema } from "@/core/onboarding";
import { diagnoseSetup, type SetupIssue } from "./diagnostics";

type User = { id: string; role: string; name?: string; tokenVersion?: number };
export class SetupError extends Error { constructor(message: string, public status = 400) { super(message); } }
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const draftSchemas = {
  business: z.object({ mode: z.enum(["", "solo", "team"]), industry: z.string().max(120) }),
  staff: z.object({ name: z.string().max(100), email: z.string().max(254), suggestedNames: z.array(z.string().min(1).max(100)).max(10).optional() }),
  services: z.object({ name: z.string().max(100), description: z.string().max(2000), duration: z.string().max(12), price: z.string().max(20), staffIds: z.array(z.string().max(100)).max(100), suggestedNames: z.array(z.string().min(1).max(100)).max(10).optional() }),
  hours: z.object({ locationId: z.string().max(100), hours: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), isOpen: z.boolean(), startTime: z.string().max(8), endTime: z.string().max(8), breakStart: z.string().max(8).nullable().optional(), breakEnd: z.string().max(8).nullable().optional() })).length(7) }),
};

export async function setupContext(user: User) {
  const business = await getBusinessForUser(user.id);
  if (!business || business.deletedAt) throw new SetupError("Negocio no encontrado.", 404);
  const permissions = await getEffectiveBusinessPermissions(user, business);
  if (!canManageSetup(permissions)) throw new SetupError("Necesitas permisos de configuración, profesionales y servicios.", 403);
  const access = await getCommercialPlanAccess(business.id);
  return { user, business, permissions, access };
}
type Context = Awaited<ReturnType<typeof setupContext>>;
type BookingContext = Awaited<ReturnType<typeof loadBookingContext>>;
async function assertMutationAuthorization(context: Context, tx: Prisma.TransactionClient) {
  const user = await tx.user.findUnique({
    where: { id: context.user.id },
    select: { id: true, role: true, deletedAt: true, tokenVersion: true },
  });
  if (!user || user.deletedAt || (context.user.tokenVersion !== undefined && user.tokenVersion !== context.user.tokenVersion))
    throw new SetupError("Tu sesión o sus permisos cambiaron. Vuelve a cargar la configuración.", 403);
  const business = await tx.business.findUnique({
    where: { id: context.business.id },
    select: { id: true, ownerId: true, deletedAt: true },
  });
  if (!business || business.deletedAt) throw new SetupError("El negocio ya no está disponible.", 403);
  const permissions = await getEffectiveBusinessPermissions(user, business, tx);
  if (!canManageSetup(permissions)) throw new SetupError("Ya no tienes permisos para modificar esta configuración.", 403);
  if (!(await getCommercialPlanAccess(business.id, new Date(), tx)).allowed)
    throw new SetupError("El acceso comercial cambió. No se guardaron cambios.", 403);
}
// No payment credentials or other provider fields are included in the fingerprint or DTO.
function fingerprint(data: BookingContext) {
  return hash({ catalog: toBookingCatalog(data), hours: data.businessHours, overrides: data.scheduleOverrides,
    locations: data.locations, staff: data.staff, services: data.services.map(s => ({ id: s.id, availabilityType: s.availabilityType, specialWeekDays: s.specialWeekDays, specialStartDate: s.specialStartDate, specialEndDate: s.specialEndDate, specialStartTime: s.specialStartTime, specialEndTime: s.specialEndTime })) });
}
export async function loadSetup(context: Context) {
  const id = context.business.id;
  const [setup, data, capacity, bookings, classification, selfStaff] = await Promise.all([
    prisma.businessSetup.findUnique({ where: { businessId: id } }), loadBookingContext(id), getStaffLimitInfo(id),
    prisma.appointment.count({ where: { businessId: id, status: { notIn: ["CANCELLED", "NO_SHOW"] } } }),
    prisma.marketplaceListing.findFirst({ where: { businessId: id }, select: { categories: { select: { category: { select: { name: true } } } } } }),
    prisma.staff.findFirst({ where: { businessId: id, userId: context.user.id, isActive: true }, select: { id: true } }),
  ]);
  const catalog = toBookingCatalog(data);
  const issues = diagnoseSetup(data);
  const hours = data.locations.some(l => l.hours.some(h => h.isOpen));
  const staffReady = catalog.rules.scheduleMode === "BUSINESS" || catalog.staff.some(s => data.staff.find(x => x.id === s.id)?.locations.some(l => l.schedule.some(h => h.isWorking)) || data.staff.find(x => x.id === s.id)?.schedule.some(h => h.isWorking));
  const verification = setup?.verification as { fingerprint?: string; date?: string; slots?: { startTime: string; endTime: string; staffId: string | null }[]; serviceId?: string; locationId?: string; optionIds?: string[]; timezone?: string; error?: string; issues?: SetupIssue[] } | null;
  const verified = !!setup?.verifiedAt && !!verification?.slots?.length && verification.fingerprint === fingerprint(data) && Date.now() - setup.verifiedAt.getTime() < 86400000 && context.access.allowed;
  const facts = { mode: setup?.mode ?? null, hours, staff: staffReady, services: catalog.services.length > 0, businessOnly: catalog.rules.scheduleMode === "BUSINESS", verified };
  const progress = setupProgress(facts);
  const activation = !setup
    ? "habitual" as const
    : activationState(verified, !!setup.sharedAt, bookings);
  return { revision: setup?.revision ?? 0, started: !!setup, currentStep: setup?.currentStep ?? progress.next, mode: setup?.mode ?? null,
    industry: setup?.industry ?? classification?.categories[0]?.category.name ?? "", draft: (setup?.draft ?? {}) as Record<string, unknown>,
    completed: !!setup?.completedAt, verified, paused: !!setup?.pausedAt, shared: !!setup?.sharedAt, dismissed: !!setup?.dismissedAt,
    facts, progress, issues, activation, bookings,
    business: { name: data.name, slug: data.slug, currency: data.currencyCode, timezone: data.timezone }, userName: context.user.name ?? "",
    publicPath: `/widget/${encodeURIComponent(data.slug)}`, capacity: { current: capacity.currentCount, total: capacity.maxAllowed, canAdd: capacity.canAdd },
    catalog, selfStaffId: selfStaff?.id ?? null, locations: data.locations.map(l => ({ id: l.id, name: l.name, hours: l.hours })),
    staff: data.staff.map(s => ({ id: s.id, name: s.name, serviceIds: s.services.map(v => v.id), hasHours: s.locations.some(l => l.schedule.some(h => h.isWorking)) || s.schedule.some(h => h.isWorking), locationIds: s.locations.map(l => l.locationId) })),
    verification: verification ? { date: verification.date, slots: verification.slots ?? [], serviceId: verification.serviceId, locationId: verification.locationId, timezone: verification.timezone, error: verification.error, issues: verification.issues ?? [] } : null,
    optional: { website: context.access.has("website.editor"), contactFlow: context.access.has("contact_flow"), puriPlus: context.access.has("puri.plus") },
  };
}
export type SetupSnapshot = Awaited<ReturnType<typeof loadSetup>>;

const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("profile"), mode: z.enum(["solo", "team"]), industry: z.string().trim().max(120) }),
  z.object({ type: z.literal("hours"), hours: hoursSchema, locationId: z.string().min(1).max(100) }),
  z.object({ type: z.literal("staff"), name: z.string().trim().min(1).max(100), email: z.union([z.email(), z.literal("")]).optional(), locationIds: z.array(z.string().min(1).max(100)).min(1).max(50).optional() }),
  z.object({ type: z.literal("staff-hours"), staffId: z.string().min(1).max(100), locationId: z.string().min(1).max(100), hours: hoursSchema }),
  z.object({ type: z.literal("assign-service"), staffId: z.string().min(1).max(100), serviceId: z.string().min(1).max(100) }),
  z.object({ type: z.literal("service"), name: z.string().trim().min(1).max(100), description: z.string().max(2000).default(""), duration: z.number().int().min(5).max(480), price: z.number().min(0).max(1e9), staffIds: z.array(z.string().min(1).max(100)).min(1).max(100) }),
  z.object({ type: z.literal("navigate"), step: setupStepSchema }),
  z.object({ type: z.literal("draft"), step: setupStepSchema, value: z.record(z.string().max(100), z.unknown()) }),
  z.object({ type: z.literal("pause") }), z.object({ type: z.literal("resume") }), z.object({ type: z.literal("share") }), z.object({ type: z.literal("dismiss") }),
  z.object({ type: z.literal("finish") }),
  z.object({ type: z.literal("check"), serviceId: z.string().min(1).max(100), locationId: z.string().min(1).max(100), date: z.string().date().optional(), optionIds: z.array(z.string().min(1).max(100)).max(50).default([]) }),
]);
export const setupRequestSchema = z.object({ key: z.uuid(), revision: z.number().int().min(0), command: commandSchema });
export type SetupCommand = z.infer<typeof commandSchema>;

async function probe(data: BookingContext, command: Extract<SetupCommand, { type: "check" }>) {
  const location = data.locations.find(l => l.id === command.locationId);
  if (!location) throw new SetupError("Selecciona una sucursal activa de este negocio.");
  if (!data.services.some(s => s.id === command.serviceId)) throw new SetupError("Selecciona un servicio reservable de este negocio.");
  const issues = diagnoseSetup(data, command);
  if (issues.length) return { fingerprint: fingerprint(data), slots: [], serviceId: command.serviceId, locationId: location.id, issues, error: issues.map(i => i.message).join(" ") };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: location.timezone || data.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const first = command.date ?? today;
  // At most 14 dates, always using the exact public availability engine, including busy time.
  for (let offset = 0; offset < (command.date ? 1 : 14); offset++) {
    const date = new Date(Date.parse(`${first}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
    const result = await getBookingAvailability(data, { date, serviceId: command.serviceId, locationId: location.id, selectedOptionAlternativeIds: command.optionIds, firstAvailable: toBookingCatalog(data).rules.scheduleMode === "STAFF" });
    if (result.slots.length) return { fingerprint: fingerprint(data), date, serviceId: command.serviceId, locationId: location.id, optionIds: command.optionIds, timezone: result.timezone, slots: result.slots.slice(0, 8) };
  }
  return { fingerprint: fingerprint(data), slots: [], serviceId: command.serviceId, locationId: location.id, error: command.date ? "No hay horas libres en esa fecha. Prueba otra fecha o revisa los horarios y bloqueos." : "No encontramos horas libres en los próximos 14 días. Revisa horarios, profesionales, sucursal y bloqueos, o prueba una fecha específica." };
}

export async function mutateSetup(context: Context, raw: unknown) {
  const parsed = setupRequestSchema.safeParse(raw);
  if (!parsed.success) throw new SetupError(parsed.error.issues[0]?.message ?? "Solicitud inválida.");
  if (!context.access.allowed) throw new SetupError("Tu suscripción no permite modificar la configuración en este momento.", 403);
  const { command, revision, key } = parsed.data;
  if (command.type === "draft" && JSON.stringify(command.value).length > 16000) throw new SetupError("El borrador es demasiado grande.");
  if (command.type === "draft") {
    if (command.step === "check" || !draftSchemas[command.step].safeParse(command.value).success) throw new SetupError("El borrador tiene un formato inválido.");
  }
  const businessId = context.business.id;
  const payloadHash = hash(command);
  // Read completed operations before costly calendar checks. The transaction rechecks
  // under the tenant lock, including the race where another device finishes first.
  const replay = await prisma.setupOperation.findUnique({ where: { businessId_key: { businessId, key } } });
  if (replay) {
    if (replay.payloadHash !== payloadHash) throw new SetupError("La solicitud ya fue utilizada con otros datos.", 409);
    // A matching idempotency key is not an authorization grant. Reacquire the
    // tenant lock and revalidate the current session, membership, permissions
    // and entitlement before returning the prior result.
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR NO KEY UPDATE`;
      await assertMutationAuthorization(context, tx);
      const current = await tx.setupOperation.findUnique({ where: { businessId_key: { businessId, key } } });
      if (!current) throw new SetupError("La operación ya no está disponible.", 409);
      if (current.payloadHash !== payloadHash) throw new SetupError("La solicitud ya fue utilizada con otros datos.", 409);
    });
    return loadSetup(context);
  }
  // Checks may contact authorized external calendars. Never hold a database lock while waiting.
  const checkedData = command.type === "check" ? await loadBookingContext(businessId) : null;
  const verification = command.type === "check" && checkedData ? await probe(checkedData, command) : null;
  let finalVerification: Awaited<ReturnType<typeof probe>> | null = null;
  if (command.type === "finish") {
    const state = await prisma.businessSetup.findUnique({ where: { businessId } });
    const v = state?.verification as { serviceId?: string; locationId?: string; date?: string; optionIds?: string[]; slots?: unknown[]; fingerprint?: string } | null;
    if (!state?.verifiedAt || !v?.serviceId || !v.locationId || !v.slots?.length) throw new SetupError("Comprueba la disponibilidad antes de finalizar.", 409);
    finalVerification = await probe(await loadBookingContext(businessId), { type: "check", serviceId: v.serviceId, locationId: v.locationId, date: v.date, optionIds: v.optionIds ?? [] });
    if (!finalVerification.slots.length) throw new SetupError("La hora disponible cambió. Vuelve a comprobar tu agenda.", 409);
  }
  await prisma.$transaction(async tx => {
    // Shared with capacity and staff creation, so two devices cannot exceed the catalog limit.
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${businessId} FOR NO KEY UPDATE`;
    // The request may have waited behind another transaction. Re-read session,
    // membership, permissions and commercial access after acquiring the lock.
    await assertMutationAuthorization(context, tx);
    const prior = await tx.setupOperation.findUnique({ where: { businessId_key: { businessId, key } } });
    if (prior) { if (prior.payloadHash !== payloadHash) throw new SetupError("La solicitud ya fue utilizada con otros datos.", 409); return; }
    const state = await tx.businessSetup.upsert({ where: { businessId }, create: { businessId }, update: {} });
    if (state.revision !== revision) throw new SetupError("La configuración cambió en otra pestaña o dispositivo. Recarga para continuar con los datos actuales.", 409);
    const update: Prisma.BusinessSetupUpdateInput = { revision: { increment: 1 } };
    const drafts = { ...(state.draft as Record<string, unknown>) };
    switch (command.type) {
      case "profile": update.mode = command.mode; update.industry = command.industry; update.currentStep = "hours"; delete drafts.business; break;
      case "navigate": update.currentStep = command.step; break;
      case "draft":
        if (command.step === "check") throw new SetupError("Ese paso no guarda formularios.");
        drafts[command.step] = draftSchemas[command.step].parse(command.value);
        update.currentStep = command.step; break;
      case "hours":
        await writeBusinessHours(tx, businessId, command.hours, command.locationId);
        update.verifiedAt = null; delete drafts.hours; break;
      case "staff": {
        const email = command.email?.toLowerCase() || undefined;
        const existing = await tx.staff.findFirst({ where: { businessId, ...(email ? { email } : { name: { equals: command.name, mode: "insensitive" } }) } });
        if (existing && !existing.isActive) throw new SetupError("Ya existe una ficha inactiva de esta persona. Revísala desde Profesionales antes de continuar.", 409);
        if (!existing) await createStaff({ businessId, name: command.name, email, locationIds: command.locationIds }, tx);
        const remaining = ((drafts.staff as { suggestedNames?: string[] } | undefined)?.suggestedNames ?? []).filter(n => n.toLowerCase() !== command.name.toLowerCase());
        if (remaining.length) drafts.staff = { name: remaining[0], email: "", suggestedNames: remaining }; else delete drafts.staff;
        update.verifiedAt = null; break;
      }
      case "staff-hours": {
        const assignment = await tx.staffLocation.findFirst({ where: { staffId: command.staffId, locationId: command.locationId, isActive: true, staff: { businessId, isActive: true }, location: { businessId, isActive: true } } });
        if (!assignment) throw new SetupError("El profesional no atiende en esta sucursal.", 403);
        for (const { isOpen, ...h } of command.hours) {
          const fields = { ...h, isWorking: isOpen, breakStart: h.breakStart || null, breakEnd: h.breakEnd || null };
          await tx.staffLocationSchedule.upsert({ where: { staffLocationId_dayOfWeek: { staffLocationId: assignment.id, dayOfWeek: h.dayOfWeek } }, create: { staffLocationId: assignment.id, ...fields }, update: fields });
        }
        update.verifiedAt = null; break;
      }
      case "service": {
        const ids = [...new Set(command.staffIds)];
        if (await tx.staff.count({ where: { businessId, id: { in: ids }, isActive: true } }) !== ids.length) throw new SetupError("Selecciona profesionales activos de este negocio.", 403);
        const existing = await tx.service.findFirst({ where: { businessId, name: { equals: command.name, mode: "insensitive" } } });
        if (existing) throw new SetupError("Ya existe un servicio con ese nombre. Revísalo desde Servicios para evitar duplicados.", 409);
        const fields = serviceSchema.parse({ name: command.name, description: command.description, duration: command.duration, price: command.price });
        const service = await createService({ ...fields, businessId, description: fields.description ?? "" }, tx);
        await tx.service.update({ where: { id: service.id, businessId }, data: { staff: { connect: ids.map(id => ({ id })) } } });
        const remaining = ((drafts.services as { suggestedNames?: string[] } | undefined)?.suggestedNames ?? []).filter(n => n.toLowerCase() !== command.name.toLowerCase());
        if (remaining.length) drafts.services = { name: remaining[0], description: "", duration: "", price: "", staffIds: ids, suggestedNames: remaining }; else delete drafts.services;
        update.verifiedAt = null; break;
      }
      case "assign-service": {
        const [staff, service] = await Promise.all([tx.staff.findFirst({ where: { id: command.staffId, businessId, isActive: true }, select: { id: true } }), tx.service.findFirst({ where: { id: command.serviceId, businessId, isActive: true }, select: { id: true } })]);
        if (!staff || !service) throw new SetupError("Selecciona un servicio y un profesional activos de este negocio.", 403);
        await tx.staff.update({ where: { id: staff.id, businessId }, data: { services: { connect: { id: service.id } } } });
        update.verifiedAt = null; break;
      }
      case "check": {
        // A catalog edit during the probe invalidates the evidence, even across devices.
        if (verification?.fingerprint !== fingerprint(await loadBookingContext(businessId, tx))) throw new SetupError("Los horarios cambiaron durante la comprobación. Vuelve a comprobar.", 409);
        update.verification = verification as Prisma.InputJsonValue; update.verifiedAt = verification?.slots.length ? new Date() : null; break;
      }
      case "finish": {
        const v = state.verification as { serviceId?: string; locationId?: string; date?: string; slots?: unknown[]; fingerprint?: string } | null;
        const liveFingerprint = fingerprint(await loadBookingContext(businessId, tx));
        if (!state.verifiedAt || !v?.slots?.length || v.fingerprint !== liveFingerprint || finalVerification?.fingerprint !== liveFingerprint || Date.now() - state.verifiedAt.getTime() > 15 * 60000) throw new SetupError("Comprueba la disponibilidad antes de finalizar.", 409);
        update.completedAt = new Date(); update.pausedAt = null; update.currentStep = "check"; break;
      }
      case "pause": update.pausedAt = new Date(); break;
      case "resume": update.pausedAt = null; break;
      case "share": update.sharedAt = new Date(); break;
      case "dismiss": update.dismissedAt = new Date(); break;
    }
    update.draft = drafts as Prisma.InputJsonValue;
    await tx.businessSetup.update({ where: { businessId }, data: update });
    await tx.setupOperation.create({ data: { businessId, key, payloadHash, result: { type: command.type } } });
  }, { timeout: 15000 });
  return loadSetup(context);
}
