import { NextRequest } from "next/server";
import { z } from "zod";
import { giftCardClaimLimiter } from "@/server/lib/rate-limit";
import { getClientPortalAccountFromRequest } from "@/server/services/client-portal.service";
import { claimGiftCard } from "@/server/services/gift-card.service";

export async function POST(request: NextRequest) {
  const limited = giftCardClaimLimiter.check(request);
  if (limited) return limited;
  const account = await getClientPortalAccountFromRequest(request);
  if (!account) return Response.json({ error: "Debes iniciar sesión con una cuenta de cliente activada" }, { status: 401 });
  const parsed = z.object({ token: z.string().min(32).max(200).optional(), code: z.string().min(8).max(40).optional() }).refine((value) => Boolean(value.token || value.code)).safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Código inválido" }, { status: 400 });
  try {
    const card = await claimGiftCard({ accountId: account.id, ...parsed.data });
    return Response.json({ ok: true, giftCardId: card.id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo agregar la Gift Card" }, { status: 409 });
  }
}
