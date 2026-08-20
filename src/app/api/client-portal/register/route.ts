import { NextRequest } from "next/server";
import { clientPortalRegisterSchema } from "@/server/validations/client-portal";
import { clientPortalAccountEmailLimiter } from "@/server/lib/rate-limit";
import { getClientPortalAppUrl, registerClientPortalAccount } from "@/server/services/client-portal.service";
import { sendClientPortalVerificationEmail } from "@/server/email/send";

export async function POST(request: NextRequest) {
  const limited = clientPortalAccountEmailLimiter.check(request);
  if (limited) return limited;
  const parsed = clientPortalRegisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const result = await registerClientPortalAccount(parsed.data);
  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });

  const verificationUrl = `${getClientPortalAppUrl(request.nextUrl.origin)}/mi-agenda/activar/${result.token}`;
  const sent = await sendClientPortalVerificationEmail(parsed.data.email, parsed.data.name, verificationUrl);
  if (!sent) return Response.json({ error: "No pudimos enviar el correo de verificación. Intenta nuevamente." }, { status: 503 });
  return Response.json({ ok: true, message: "Revisa tu correo para activar la cuenta." });
}
