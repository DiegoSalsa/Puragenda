import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_NOTIFICATION_EMAILS } from "@/core/constants";
import { EMAIL_FROM, resend } from "@/server/email/resend";
import { contactDistributedLimiter } from "@/server/lib/distributed-rate-limit";
import { requireSameOrigin } from "@/server/security/same-origin";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(3000),
  sourcePath: z.string().startsWith("/").max(160).default("/contacto"),
  website: z.string().max(200).optional(),
}).strict();

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character);
}

export async function POST(request: NextRequest) {
  const limited = await contactDistributedLimiter.check(request);
  if (limited) return limited;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa los datos del formulario." }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true }, { status: 202 });

  const { name, email, message, sourcePath } = parsed.data;
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: ADMIN_NOTIFICATION_EMAILS,
    replyTo: email,
    subject: `Nuevo contacto comercial de ${name}`,
    html: `
      <h1>Nuevo contacto desde Puragenda</h1>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
      <p><strong>Página:</strong> ${escapeHtml(sourcePath)}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
    `,
  });

  if (result.error) {
    console.error("[contact] Resend rejected lead", result.error);
    return NextResponse.json({ error: "No se pudo enviar el mensaje." }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
