import { NextRequest } from "next/server";
import { authorizeBookingRead, availabilityQuerySchema, bookingJson, bookingReadError } from "@/server/booking/http";
import { getBookingAvailability, loadBookingContext } from "@/server/booking/read.service";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authorized = await authorizeBookingRead(request, (await params).slug);
    if (authorized instanceof Response) return authorized;
    const search = new URL(request.url).searchParams;
    const allowed = new Set(["date", "serviceId", "serviceIds", "locationId", "staffId", "firstAvailable", "selectedOptionAlternativeIds"]);
    if ([...search.keys()].some((key) => !allowed.has(key) || (!["selectedOptionAlternativeIds", "serviceIds"].includes(key) && search.getAll(key).length > 1))) return bookingJson({ error: "Parámetros inválidos", code: "INVALID_QUERY" }, 400);
    const parsed = availabilityQuerySchema.safeParse({ ...Object.fromEntries(search), serviceIds: search.getAll("serviceIds"), selectedOptionAlternativeIds: search.getAll("selectedOptionAlternativeIds") });
    if (!parsed.success) return bookingJson({ error: "Parámetros inválidos", code: "INVALID_QUERY" }, 400);
    return bookingJson(await getBookingAvailability(await loadBookingContext(authorized.id), parsed.data));
  } catch (error) { return bookingReadError(error); }
}
