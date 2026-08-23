import { NextRequest, NextResponse } from "next/server";
import { getClientPortalEmailFromRequest } from "@/server/services/client-portal.service";
import { getGoogleWalletSaveUrl } from "@/server/services/loyalty-wallet.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const email = await getClientPortalEmailFromRequest(request);
  if (!email) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { clientId } = await params;
  try {
    const saveUrl = await getGoogleWalletSaveUrl(clientId, email);
    if (!saveUrl) return Response.json({ error: "Tarjeta no disponible" }, { status: 404 });
    const response = NextResponse.redirect(saveUrl, 302);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[Loyalty Wallet] Google pass creation failed:", error);
    return Response.json({ error: "No se pudo preparar la tarjeta para Google Wallet" }, { status: 503 });
  }
}
