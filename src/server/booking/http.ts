import { z } from "zod";
import { NextRequest } from "next/server";
import { getBusinessBySlug, validateApiKey } from "@/server/services/business.service";
import { operationalSubscriptionDeniedResponse } from "@/server/http/subscription-access";
import { BookingSelectionError } from "@/core/booking-selection";
import { rateLimit } from "@/server/lib/rate-limit";
import { bookingJson } from "./response";
export { bookingJson } from "./response";

const limiter = rateLimit({ windowMs: 60000, max: 120 });
export const availabilityQuerySchema = z.object({
  date: z.string().date(), serviceId: z.string().min(1).max(100), locationId: z.string().min(1).max(100).optional(),
  staffId: z.string().min(1).max(100).optional(), firstAvailable: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  selectedOptionAlternativeIds: z.array(z.string().min(1).max(100)).max(50).default([]),
});
export async function authorizeBookingRead(request: NextRequest, slug: string) {
  const limited = limiter.check(request);
  if (limited) {
    const response = bookingJson({ error: "Demasiadas solicitudes", code: "RATE_LIMITED" }, 429);
    response.headers.set("Retry-After", limited.headers.get("Retry-After") ?? "60");
    return response;
  }
  if (slug.length > 100 || request.url.length > 8192) return bookingJson({ error: "Solicitud demasiado grande", code: "REQUEST_TOO_LARGE" }, 413);
  const business = await getBusinessBySlug(slug);
  if (!business) return bookingJson({ error: "Negocio no encontrado", code: "BUSINESS_NOT_FOUND" }, 404);
  if (!validateApiKey(business, request.headers.get("x-api-key"))) return bookingJson({ error: "API Key inválida o no proporcionada", code: "UNAUTHORIZED" }, 401);
  const denied = operationalSubscriptionDeniedResponse(business.subscription);
  if (denied) return bookingJson(await denied.json(), 403);
  return business;
}
export function bookingReadError(error: unknown) {
  if (error instanceof BookingSelectionError) return bookingJson({ error: error.message, code: error.code }, error.status);
  return bookingJson({ error: "Error interno del servidor", code: "INTERNAL_ERROR" }, 500);
}
