import { NextRequest, NextResponse } from "next/server";
import { marketingLimiter } from "@/server/lib/rate-limit";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { getSubscriptionByBusinessId } from "@/server/services/subscription.service";
import {
  getMarketingLimits,
  getCampaignsThisMonth,
  getWinBackAudience,
  recordCampaign,
} from "@/server/services/marketing.service";
import { resend } from "@/server/email/resend";
import { marketingCampaignEmail } from "@/server/email/templates";
import type { SubscriptionPlan } from "@/core/entities";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const blocked = marketingLimiter.check(request);
    if (blocked) return blocked;
    // ── 1. Auth ──
    const user = await getApiSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ── 2. Get business + subscription ──
    const business = await getBusinessForUser(user.id);
    if (!business) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const subscription = await getSubscriptionByBusinessId(business.id);
    const plan: SubscriptionPlan = subscription?.plan ?? "INDIVIDUAL";

    // ── 3. Validate frequency: max 1 campaign per month ──
    const campaignsSent = await getCampaignsThisMonth(business.id);
    const limits = getMarketingLimits(plan);

    if (campaignsSent >= limits.maxCampaignsPerMonth) {
      return NextResponse.json(
        {
          error: "Límite alcanzado",
          message: "Ya enviaste tu campaña de marketing este mes. Podrás enviar otra el próximo mes.",
        },
        { status: 403 }
      );
    }

    // ── 4. Parse request body ──
    const body = await request.json();
    const { subject, message } = body as { subject?: string; message?: string };

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "El asunto del correo es requerido" }, { status: 400 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "El mensaje del correo es requerido" }, { status: 400 });
    }

    // ── 5. Get Win-Back audience ──
    const audience = await getWinBackAudience(business.id, limits.maxEmails);

    if (audience.length === 0) {
      return NextResponse.json(
        {
          error: "Sin audiencia",
          message: "No hay clientes disponibles que acepten marketing. Asegúrate de tener clientes registrados con marketing habilitado.",
        },
        { status: 400 }
      );
    }

    // ── 6. Build widget URL for CTA ──
    const appUrl = process.env.NODE_ENV === "production" ? "https://www.puragenda.cl" : "http://localhost:3000";
    const widgetUrl = `${appUrl}/widget/${business.slug}`;

    // ── 7. Build email batch ──
    const senderName = `${business.name} (vía Puragenda)`;
    const senderEmail = "marketing@puragenda.cl";
    const from = `${senderName} <${senderEmail}>`;

    const emails = audience.map((client) => {
      const { html } = marketingCampaignEmail({
        clientName: client.name,
        businessName: business.name,
        subject: subject.trim(),
        body: message.trim(),
        widgetUrl,
      });

      return {
        from,
        to: client.email,
        subject: subject.trim(),
        html,
      };
    });

    // ── 8. Send via Resend Batch API ──
    try {
      await resend.batch.send(emails);
    } catch (emailError) {
      console.error("[Marketing] Error sending batch emails:", emailError);
      return NextResponse.json(
        {
          error: "Error al enviar",
          message: "Hubo un error al enviar los correos. Por favor, intenta de nuevo más tarde.",
        },
        { status: 500 }
      );
    }

    // ── 9. Record campaign ──
    await recordCampaign(business.id, subject.trim(), message.trim(), audience.length);

    console.log(`[Marketing] Campaign sent: "${subject}" to ${audience.length} clients for business ${business.name}`);

    return NextResponse.json({
      success: true,
      audienceSize: audience.length,
      message: `Campaña enviada exitosamente a ${audience.length} cliente${audience.length !== 1 ? "s" : ""}.`,
    });
  } catch (error) {
    console.error("[Marketing] Unexpected error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
