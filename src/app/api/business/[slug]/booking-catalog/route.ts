import { NextRequest } from "next/server";
import { authorizeBookingRead, bookingJson, bookingReadError } from "@/server/booking/http";
import { loadBookingContext, toBookingCatalog } from "@/server/booking/read.service";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const authorized = await authorizeBookingRead(request, (await params).slug);
    if (authorized instanceof Response) return authorized;
    return bookingJson(toBookingCatalog(await loadBookingContext(authorized.id)));
  } catch (error) { return bookingReadError(error); }
}
