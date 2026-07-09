import { prisma } from "@/server/db/prisma";

const RESPONSE_TO = "contacto@purocode.com";

type InteractionAnswer = Record<string, string>;

function appBaseUrl() {
  if (process.env.NODE_ENV === "development") {
    return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  }
  return "https://www.puragenda.cl";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function answersHtml(answers?: InteractionAnswer | null) {
  if (!answers || Object.keys(answers).length === 0) return "<p style=\"margin:0;color:#6b7280;\">Sin respuestas adicionales.</p>";

  return Object.entries(answers)
    .map(([label, value]) => `
      <tr>
        <td style="padding:8px 0;color:#6b7280;font-size:13px;">${escapeHtml(label)}</td>
        <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:700;">${escapeHtml(value || "-")}</td>
      </tr>
    `)
    .join("");
}

async function notifyInteractiveResponse(params: {
  campaignTitle: string;
  campaignType: string;
  question: string;
  recipientEmail: string;
  recipientName: string;
  businessName?: string | null;
  rating?: number | null;
  answers?: InteractionAnswer | null;
  comment?: string | null;
}) {
  const { resend, EMAIL_FROM } = await import("@/server/email/resend");

  const ratingLine = params.rating
    ? `<p style="font-size:28px;font-weight:900;margin:8px 0;color:#7C3AED;">${params.rating}/7</p>`
    : "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px;background:#ffffff;color:#111827;">
      <p style="margin:0 0 8px;color:#7C3AED;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Respuesta interactiva Puragenda</p>
      <h1 style="margin:0 0 18px;font-size:22px;line-height:1.25;">${escapeHtml(params.campaignTitle)}</h1>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:18px;">
        <p style="margin:0;color:#6b7280;font-size:13px;">Cliente</p>
        <p style="margin:4px 0 0;font-weight:800;">${escapeHtml(params.recipientName)} &lt;${escapeHtml(params.recipientEmail)}&gt;</p>
        ${params.businessName ? `<p style="margin:4px 0 0;color:#374151;">Negocio: ${escapeHtml(params.businessName)}</p>` : ""}
      </div>
      <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Pregunta</p>
      <p style="margin:0 0 14px;font-weight:700;">${escapeHtml(params.question)}</p>
      ${ratingLine}
      ${params.comment ? `<p style="margin:14px 0;color:#111827;"><strong>Comentario:</strong> ${escapeHtml(params.comment)}</p>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        ${answersHtml(params.answers)}
      </table>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">Enviado automaticamente desde ${escapeHtml(appBaseUrl())}</p>
    </div>
  `;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: RESPONSE_TO,
    subject: `[Puragenda] Nueva respuesta: ${params.campaignTitle}`,
    html,
  });
}

export async function submitInteractiveResponse(params: {
  token: string;
  rating?: number;
  answers?: InteractionAnswer;
  comment?: string;
}) {
  const recipient = await prisma.adminInteractiveRecipient.findUnique({
    where: { token: params.token },
    include: { campaign: true, response: true },
  });

  if (!recipient) return { error: "Respuesta no encontrada" };

  const rating = params.rating ? Math.max(1, Math.min(7, Math.floor(params.rating))) : null;
  const answers = params.answers && Object.keys(params.answers).length > 0 ? params.answers : undefined;
  const comment = params.comment?.trim() || null;
  const wasAnswered = !!recipient.response;

  await prisma.$transaction([
    prisma.adminInteractiveResponse.upsert({
      where: { recipientId: recipient.id },
      create: {
        campaignId: recipient.campaignId,
        recipientId: recipient.id,
        rating,
        answers,
        comment,
      },
      update: {
        rating,
        answers,
        comment,
      },
    }),
    prisma.adminInteractiveRecipient.update({
      where: { id: recipient.id },
      data: { respondedAt: new Date() },
    }),
  ]);

  if (!wasAnswered) {
    await notifyInteractiveResponse({
      campaignTitle: recipient.campaign.title,
      campaignType: recipient.campaign.type,
      question: recipient.campaign.question,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      businessName: recipient.businessName,
      rating,
      answers,
      comment,
    });
  }

  return { success: true, type: recipient.campaign.type };
}
