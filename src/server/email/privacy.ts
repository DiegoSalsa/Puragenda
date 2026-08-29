import { ADMIN_NOTIFICATION_EMAILS } from "@/core/constants";
import { EMAIL_FROM, resend } from "@/server/email/resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] || character);
}

export async function sendPrivacyRequestAcknowledgement(input: {
  email: string;
  name: string;
  reference: string;
  requestType: string;
  dueAt: Date;
}) {
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.email,
    subject: `Recibimos tu solicitud de privacidad · ${input.reference}`,
    html: `<p>Hola ${escapeHtml(input.name)},</p><p>Recibimos tu solicitud de <strong>${escapeHtml(input.requestType)}</strong>.</p><p>Referencia: <strong>${escapeHtml(input.reference)}</strong><br>Fecha límite estimada: <strong>${input.dueAt.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}</strong>.</p><p>Antes de entregar o modificar datos verificaremos tu identidad por un canal confiable. Puedes responder este correo si necesitas agregar antecedentes.</p><p>Puragenda · contacto@purocode.com</p>`,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function sendPrivacyRequestAdminAlert(input: {
  reference: string;
  requestType: string;
  dueAt: Date;
}) {
  const recipients = (process.env.PRIVACY_ADMIN_EMAILS || ADMIN_NOTIFICATION_EMAILS.join(","))
    .split(",").map((email) => email.trim()).filter(Boolean);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.puragenda.cl";
  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: recipients,
    subject: `[Privacidad] Nueva solicitud ${input.reference}`,
    html: `<p>Se registró una solicitud de privacidad.</p><p>Tipo: <strong>${escapeHtml(input.requestType)}</strong><br>Referencia: <strong>${escapeHtml(input.reference)}</strong><br>Vence: <strong>${input.dueAt.toISOString()}</strong></p><p><a href="${appUrl}/para/x7k9m2v4q8/privacy-requests">Abrir bandeja restringida</a></p>`,
  });
  if (result.error) throw new Error(result.error.message);
}
