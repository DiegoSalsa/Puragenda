import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { prisma } from "@/server/db/prisma";
import { SUPPORTED_LOCALES } from "@/i18n/config";

const localeSchema = z.object({ locale: z.enum(SUPPORTED_LOCALES) });

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = localeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid locale" }, { status: 400 });

  const business = await getBusinessForUser(user.id);
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // A team member can keep a personal UI cookie, but only the owner controls
  // the business locale used by background jobs and transactional emails.
  if (business.ownerId !== user.id) {
    return NextResponse.json({ persistedForBusiness: false });
  }

  await prisma.business.update({
    where: { id: business.id },
    data: { locale: parsed.data.locale },
  });

  return NextResponse.json({ persistedForBusiness: true });
}
