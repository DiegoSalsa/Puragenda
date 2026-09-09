import { deriveGiftCardClaimToken } from "@/server/services/gift-card.service";
import { prisma } from "@/server/db/prisma";
import { EMAIL_FROM, resend } from "@/server/email/resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]!);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export async function sendGiftCardEmail(giftCardId: string) {
  const card = await prisma.giftCard.findUnique({
    where: { id: giftCardId },
    include: {
      business: { select: { name: true, logoUrl: true, primaryColor: true } },
      purchase: true,
      entitlements: true,
    },
  });
  if (!card) throw new Error("Gift Card no encontrada");
  const isGift = card.purchase.deliveryMode === "GIFT";
  const recipientEmail = isGift ? card.purchase.recipientEmail : card.purchase.buyerEmail;
  const recipientName = isGift ? card.purchase.recipientName : card.purchase.buyerName;
  if (!recipientEmail || !recipientName) throw new Error("La Gift Card no tiene destinatario");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = deriveGiftCardClaimToken(card.id, card.purchaseId);
  const claimUrl = baseUrl + "/mi-agenda/gift-cards/reclamar/" + encodeURIComponent(token);
  const valueHtml = card.type === "BALANCE"
    ? '<p style="margin:8px 0 0;font-size:28px;font-weight:900;">' + formatMoney(card.faceValueSnapshot || 0, card.currencyCode) + "</p>"
    : '<ul style="margin:12px 0 0;padding:0;list-style:none;">' + card.entitlements.map((item) => '<li style="margin:6px 0;font-weight:700;">✓ ' + escapeHtml(item.serviceNameSnapshot) + " × " + item.quantityInitial + "</li>").join("") + "</ul>";
  const messageHtml = isGift && card.purchase.giftMessage
    ? '<div style="margin:20px 0;padding:16px;border:2px solid #111;background:#fff;font-size:15px;line-height:1.6;">“' + escapeHtml(card.purchase.giftMessage) + '”<br><strong>— ' + escapeHtml(card.purchase.senderName || card.purchase.buyerName) + "</strong></div>"
    : "";
  const warningHtml = !isGift
    ? '<div style="margin:20px 0;padding:14px;background:#FFF5BA;border:2px solid #111;font-size:13px;line-height:1.5;"><strong>¿Vas a entregarle esta Gift Card a otra persona?</strong><br>La persona que finalmente vaya a utilizarla deberá crear o iniciar sesión en una cuenta de cliente de Puragenda y agregar la Gift Card a su cuenta antes de canjearla.</div>'
    : "";
  const subject = isGift ? "Tienes un regalo de " + (card.purchase.senderName || card.purchase.buyerName) : "Tu Gift Card está lista";
  const html = '<div style="background:#FFFAF0;padding:24px;font-family:Arial,sans-serif;color:#111;"><div style="max-width:560px;margin:auto;background:#fff;border:3px solid #111;box-shadow:8px 8px 0 #111;padding:28px;">' +
    (card.business.logoUrl ? '<img src="' + escapeHtml(card.business.logoUrl) + '" alt="" width="64" height="64" style="display:block;object-fit:cover;border-radius:14px;margin-bottom:16px;">' : "") +
    '<p style="margin:0;font-size:13px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">' + (isGift ? "Tienes un regalo 🎁" : "Tu Gift Card está lista") + "</p>" +
    '<h1 style="margin:8px 0 4px;font-size:28px;">' + escapeHtml(card.nameSnapshot) + "</h1>" +
    '<p style="margin:0;color:#555;font-weight:700;">' + escapeHtml(card.business.name) + " · Para " + escapeHtml(recipientName) + "</p>" +
    messageHtml + '<div style="margin:22px 0;padding:20px;background:' + escapeHtml(card.backgroundColorSnapshot) + ';color:' + escapeHtml(card.textColorSnapshot) + ';border:3px solid #111;">' + valueHtml + '<p style="margin:14px 0 0;font-family:monospace;font-weight:900;">' + escapeHtml(card.publicCode) + "</p></div>" + warningHtml +
    '<p style="text-align:center;margin:24px 0;"><a href="' + claimUrl + '" style="display:inline-block;background:' + escapeHtml(card.business.primaryColor) + ';color:#fff;text-decoration:none;border:3px solid #111;padding:13px 22px;font-weight:900;box-shadow:4px 4px 0 #111;">Agregar a mi cuenta</a></p>' +
    '<p style="margin:24px 0 0;text-align:center;color:#777;font-size:11px;">Gift Card emitida por ' + escapeHtml(card.business.name) + " con Puragenda.</p></div></div>";

  try {
    const result = await resend.emails.send({ from: EMAIL_FROM, to: recipientEmail, subject, html }, { idempotencyKey: "gift-card-" + card.id + "-" + Date.now() });
    await prisma.giftCard.update({ where: { id: card.id }, data: { deliveryEmailSentAt: new Date(), deliveryEmailAttempts: { increment: 1 }, deliveryEmailLastError: null } });
    return result;
  } catch (error) {
    await prisma.giftCard.update({ where: { id: card.id }, data: { deliveryEmailAttempts: { increment: 1 }, deliveryEmailLastError: (error instanceof Error ? error.message : String(error)).slice(0, 1000) } }).catch(() => {});
    throw error;
  }
}
