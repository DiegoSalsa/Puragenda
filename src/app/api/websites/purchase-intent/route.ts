import { NextRequest, NextResponse } from "next/server";
import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { rememberWebsiteIntent } from "@/server/websites/purchase-intent";
import { prisma } from "@/server/db/prisma";
import { hasWebsitePaidAccess } from "@/websites/policy";
import { requireSameOrigin } from "@/server/security/same-origin";
import { publicWebsiteAcquisitionEnabled } from "@/server/websites/public-acquisition";
import { getCommercialPlanAccess } from "@/server/services/commercial-plan-access";

export async function POST(request: NextRequest) {
  const blocked = requireSameOrigin(request);
  if (blocked) return blocked;
  const user = await getApiSessionUser(request);
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  const business = await getBusinessForUser(user.id);
  if (!business || business.ownerId !== user.id) return NextResponse.json({ error: "Solo el propietario puede contratar el sitio." }, { status: 403 });
  if (business.deletedAt) return NextResponse.json({ error: "Negocio no disponible." }, { status: 403 });
  if ((await getCommercialPlanAccess(business.id)).v2) return NextResponse.json({ nextUrl: "/dashboard/website" });
  if (business.countryCode !== "CL") return NextResponse.json({ error: "Oferta pública disponible en Chile." }, { status: 400 });
  // Pricing must not turn an existing account into a gated public bundle.
  // Registration intents and all existing Website lifecycle state remain intact.
  if (!publicWebsiteAcquisitionEnabled()) return NextResponse.json({ nextUrl: "/dashboard/website" });
  await rememberWebsiteIntent(business, user.id);
  const addon = await prisma.websiteAddon.findUnique({ where: { businessId: business.id } });
  return NextResponse.json({ nextUrl: hasWebsitePaidAccess(addon) || addon?.status === "PAST_DUE" ? "/dashboard/website" : "/onboarding/website" });
}
