import { NextRequest } from "next/server";
import { getClientPortalEmailFromRequest } from "@/server/services/client-portal.service";
import { getAppleWalletPass } from "@/server/services/loyalty-wallet.service";

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
    const pass = await getAppleWalletPass(clientId, email);
    if (!pass) return Response.json({ error: "Tarjeta no disponible" }, { status: 404 });
    return new Response(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": "attachment; filename=tarjeta-fidelizacion.pkpass",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Loyalty Wallet] Apple pass creation failed:", error);
    return Response.json({ error: "No se pudo preparar la tarjeta para Apple Wallet" }, { status: 503 });
  }
}
