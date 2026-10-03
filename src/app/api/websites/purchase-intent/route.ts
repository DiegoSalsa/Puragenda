import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { rememberWebsiteIntent } from "@/server/websites/purchase-intent";
import { prisma } from "@/server/db/prisma";
import { hasWebsitePaidAccess } from "@/websites/policy";
import { requireSameOrigin } from "@/server/security/same-origin";

export async function POST(request: NextRequest) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business || business.ownerId !== user.id) return NextResponse.json({ error: "Solo el propietario puede contratar el sitio." }, { status: 403 });
  if (business.countryCode !== "CL") return NextResponse.json({ error: "Oferta pública disponible en Chile." }, { status: 400 });
  await rememberWebsiteIntent(business, user.id);
  const addon = await prisma.websiteAddon.findUnique({ where: { businessId: business.id } });
  return NextResponse.json({ nextUrl: hasWebsitePaidAccess(addon) || addon?.status === "PAST_DUE" ? "/dashboard/website" : "/onboarding/website" });
}
