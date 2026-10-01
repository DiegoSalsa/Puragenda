import { NextRequest } from "next/server";
import { z } from "zod";
import { resolveWebsiteHost, requireWebsiteManager } from "./service";
import { getBookingAvailability, loadBookingContext } from "@/server/booking/read.service";
import { POST as canonicalBooking } from "@/app/api/business/[slug]/book/route";
import { quoteBookingSelection } from "@/core/booking-selection";
import { bookingJson, bookingReadError, availabilityQuerySchema } from "@/server/booking/http";
import { rateLimit } from "@/server/lib/rate-limit";
const limiter = rateLimit({ windowMs: 60000, max: 60 });
const inputSchema = z.object({
  serviceId: z.string().min(1).max(100), locationId: z.string().min(1).max(100),
  serviceIds: z.array(z.string().min(1).max(100)).max(10).optional(),
  staffId: z.string().max(100), optionIds: z.array(z.string().min(1).max(100)).max(50),
  staffAssignments: z.array(z.object({ serviceId: z.string().min(1).max(100), staffId: z.string().min(1).max(100) })).max(10).optional(),
  date: z.string().date(), startTime: z.iso.datetime(),
  customerName: z.string().trim().min(2).max(100), customerEmail: z.email().max(255),
  customerPhone: z.string().regex(/^\+?[0-9\s()-]{8,18}$/), customerAddress: z.string().max(300).optional(),
}).strict();
export async function websiteAvailability(request: NextRequest) {
  try {
    const limited = limiter.check(request); if (limited) return limited;
    const site = request.nextUrl.searchParams.get("preview") === "1"
      ? { businessId: (await requireWebsiteManager()).business.id }
      : await resolveWebsiteHost((request.headers.get("x-puragenda-website-host") ?? request.headers.get("host")) ?? "");
    if (!site) return bookingJson({ error: "Sitio no disponible" }, 404);
    const params = request.nextUrl.searchParams;
    const query = availabilityQuerySchema.parse({ date: params.get("date"), serviceId: params.get("serviceId"), serviceIds: params.get("serviceIds")?.split(",").filter(Boolean), locationId: params.get("locationId"), staffId: params.get("staffId") && params.get("staffId") !== "any" ? params.get("staffId") : undefined, firstAvailable: params.get("staffId") === "any" ? "true" : "false", selectedOptionAlternativeIds: params.get("optionIds")?.split(",").filter(Boolean) ?? [] });
    const data = await getBookingAvailability(await loadBookingContext(site.businessId), query);
    return bookingJson({ mode: "connected", date: data.date, slots: data.slots.map(slot => ({ ...slot, label: new Intl.DateTimeFormat("es-CL", { timeZone: data.timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(slot.startTime)) })) });
  } catch (error) { if (error instanceof z.ZodError) return bookingJson({ error: "Selección inválida" }, 400); return bookingReadError(error); }
}
export async function websiteBooking(request: NextRequest) {
  try {
    const limited = limiter.check(request); if (limited) return limited;
    const origin = request.headers.get("origin");
    const host = (request.headers.get("x-puragenda-website-host") ?? request.headers.get("host"));
    if (!origin || new URL(origin).host !== host || request.headers.get("sec-fetch-site") === "cross-site") return bookingJson({ error: "Origen no autorizado" }, 403);
    if (Number(request.headers.get("content-length") ?? 0) > 32768) return bookingJson({ error: "Solicitud demasiado grande" }, 413);
    const key = request.headers.get("idempotency-key");
    const site = await resolveWebsiteHost(host ?? "");
    if (!site) return bookingJson({ error: "Sitio no disponible" }, 404);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 32768) return bookingJson({ error: "Solicitud demasiado grande" }, 413);
    const input = inputSchema.parse(JSON.parse(raw));
    const serviceIds = [...new Set(input.serviceIds?.length ? input.serviceIds : [input.serviceId])];
    if (!serviceIds.includes(input.serviceId)) return bookingJson({ error: "La lista de servicios no es válida" }, 400);
    if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key)) return bookingJson({ error: "Clave de operación requerida" }, 400);
    const context = await loadBookingContext(site.businessId);
    const services = serviceIds.map(id => context.services.find(item => item.id === id)).filter((item): item is (typeof context.services)[number] => Boolean(item));
    if (services.length !== serviceIds.length) return bookingJson({ error: "Uno o más servicios no están disponibles" }, 400);
    const quote = quoteBookingSelection(services, input.optionIds);
    // Delegate all scheduling validation, collision locks, payments, notifications
    // and operation idempotency to the existing writer. No HTTP loopback or keys
    // in browser payloads; no client price/duration/endTime accepted.
    const body = { serviceId: input.serviceId, serviceIds, locationId: input.locationId, staffId: input.staffId || undefined, staffAssignments: input.staffAssignments, selectedOptionAlternativeIds: input.optionIds, customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone, customerAddress: input.customerAddress, startTime: input.startTime, endTime: new Date(Date.parse(input.startTime) + quote.duration * 60000).toISOString() };
    const headers = new Headers({ "Content-Type": "application/json", "x-api-key": site.business.apiKey, "Puragenda-Booking-Version": "1", "Idempotency-Key": key });
    // Maintain the existing limiter's client identity through the in-process adapter.
    for (const name of ["x-forwarded-for", "x-real-ip"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
    const response = await canonicalBooking(new NextRequest(new URL(`/api/business/${site.business.slug}/book`, request.url), { method: "POST", headers, body: JSON.stringify(body) }), { params: Promise.resolve({ slug: site.business.slug }) });
    if (!response.ok) return response;
    const data = await response.json();
    const booking = data.booking ?? { state: data.status === "CONFIRMED" ? "confirmed" : data.status === "AWAITING_PAYMENT" ? "awaiting_payment" : data.status === "CANCELLED" ? "cancelled" : "pending" };
    if (!data.id || !["confirmed", "pending", "awaiting_payment"].includes(booking.state)) return bookingJson({ error: "Resultado incierto. Consulta al negocio antes de reenviar." }, 502);
    const recovery = data.operationStatus === "RECOVERY_REQUIRED";
    const confirmed = booking.state === "confirmed" && !data.depositRequired && !recovery;
    return bookingJson({ kind: confirmed ? "confirmed" : "pending", id: data.id, message: recovery ? "Tu cita existe y requiere revisión. Consulta al negocio antes de pagar o reservar otra vez." : confirmed ? "Tu reserva fue confirmada por Puragenda." : "Tu cita fue recibida. Revisa las instrucciones del negocio para completar tu reserva.", paymentUrl: !recovery && data.paymentUrl || undefined, recoveryRequired: recovery }, response.status);
  } catch (error) { if (error instanceof z.ZodError || error instanceof SyntaxError) return bookingJson({ error: "Solicitud inválida" }, 400); return bookingReadError(error); }
}
