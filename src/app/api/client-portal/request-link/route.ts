import { NextRequest } from "next/server";
import { z } from "zod";
import { sendClientPortalAccessEmail } from "@/server/email/send";
import { clientPortalLinkLimiter } from "@/server/lib/rate-limit";
import {
  CLIENT_PORTAL_LINK_MINUTES,
  getClientPortalAppUrl,
  hasClientPortalRecords,
  issueClientPortalMagicToken,
  normalizeClientPortalEmail,
} from "@/server/services/client-portal.service";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(request: NextRequest) {
  const limited = clientPortalLinkLimiter.check(request);
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Ingresa un correo válido" }, { status: 400 });
    }

    const email = normalizeClientPortalEmail(parsed.data.email);
    if (await hasClientPortalRecords(email)) {
      const { token } = await issueClientPortalMagicToken(email);
      const portalUrl = `${getClientPortalAppUrl(request.nextUrl.origin)}/mi-agenda/entrar/${token}`;
      await sendClientPortalAccessEmail(email, portalUrl, CLIENT_PORTAL_LINK_MINUTES);
    }

    // The same response prevents discovering which emails have bookings.
    return Response.json({
      ok: true,
      message: "Si encontramos reservas asociadas, recibirás un enlace en unos minutos.",
    });
  } catch (error) {
    console.error("[client portal request link]", error);
    return Response.json({ error: "No pudimos procesar la solicitud" }, { status: 500 });
  }
}
