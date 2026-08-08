import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 404 });
  }

  const campaign = await prisma.storyCampaign.findUnique({
    where: { token },
    select: { id: true, destinationUrl: true },
  });
  if (!campaign) return NextResponse.json({ error: "Historia no encontrada" }, { status: 404 });

  await prisma.storyCampaign.update({
    where: { id: campaign.id },
    data: { linkVisits: { increment: 1 }, lastVisitedAt: new Date() },
  });

  const destination = new URL(campaign.destinationUrl);
  const allowedOrigin = new URL(request.nextUrl.origin);
  if (destination.origin !== allowedOrigin.origin && process.env.NODE_ENV !== "production") {
    destination.protocol = allowedOrigin.protocol;
    destination.host = allowedOrigin.host;
  }
  if (!destination.pathname.startsWith("/widget/")) {
    return NextResponse.json({ error: "Destino no válido" }, { status: 400 });
  }
  const response = NextResponse.redirect(destination, 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
