import { NextRequest } from "next/server";
import { getClientPortalEmailFromRequest, getClientPortalProfile } from "@/server/services/client-portal.service";

export async function GET(request: NextRequest) {
  const email = getClientPortalEmailFromRequest(request);
  if (!email) return Response.json({ error: "No autenticado" }, { status: 401 });
  const profile = await getClientPortalProfile(email);
  if (!profile) return Response.json({ error: "Cuenta no activada" }, { status: 404 });
  return Response.json(profile, { headers: { "Cache-Control": "no-store" } });
}
