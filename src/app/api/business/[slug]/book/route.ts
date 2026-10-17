import { NextRequest } from "next/server";
import { executeBooking } from "@/server/booking/create-http";
export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  return executeBooking(request, context);
}
