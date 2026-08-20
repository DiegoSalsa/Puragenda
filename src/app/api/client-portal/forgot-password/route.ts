import { NextRequest } from "next/server";
import { clientPortalEmailSchema } from "@/server/validations/client-portal";
import { clientPortalAccountEmailLimiter } from "@/server/lib/rate-limit";
import { prisma } from "@/server/db/prisma";
import {
  getClientPortalAppUrl,
  issueClientPortalPasswordResetToken,
  normalizeClientPortalEmail,
} from "@/server/services/client-portal.service";
import { sendClientPortalPasswordResetEmail } from "@/server/email/send";

export async function POST(request: NextRequest) {
  const limited = clientPortalAccountEmailLimiter.check(request);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = clientPortalEmailSchema.safeParse(body?.email);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const email = normalizeClientPortalEmail(parsed.data);
  const account = await prisma.clientPortalAccount.findUnique({ where: { email }, select: { emailVerifiedAt: true } });
  if (account?.emailVerifiedAt) {
    const { token } = await issueClientPortalPasswordResetToken(email);
    const resetUrl = `${getClientPortalAppUrl(request.nextUrl.origin)}/mi-agenda/restablecer/${token}`;
    await sendClientPortalPasswordResetEmail(email, resetUrl);
  }
  return Response.json({ ok: true, message: "Si la cuenta existe, recibirás un enlace para restablecerla." });
}
