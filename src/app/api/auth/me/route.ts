import { getApiSessionUser } from "@/server/auth/user-session";
import { getBusinessForUser } from "@/server/services/business.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = await getApiSessionUser(request);

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const business = await getBusinessForUser(user.id);

  return NextResponse.json({
    user,
    business: business ? { name: business.name, logoUrl: business.logoUrl } : null,
  }, { status: 200 });
}
