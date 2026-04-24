import { prisma } from "@/server/db/prisma";
import { WidgetClient } from "./widget-client";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const { slug } = await params;
  const { color } = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: { orderBy: { name: "asc" } },
    },
  });

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] p-5">
        <div className="w-full max-w-lg rounded-2xl border border-white/[0.06] bg-[#111] p-8 text-center">
          <p className="text-xl font-semibold">Negocio no encontrado</p>
          <p className="mt-2 text-sm text-white/40">
            El identificador &ldquo;{slug}&rdquo; no existe.
          </p>
        </div>
      </div>
    );
  }

  const widgetColor = color || business.brandColor || "0085CB";

  return (
    <WidgetClient
      business={{ name: business.name, slug: business.slug, apiKey: business.apiKey, brandColor: widgetColor }}
      services={business.services.map((s) => ({ id: s.id, name: s.name, description: s.description, duration: s.duration, price: s.price }))}
      primaryColor={widgetColor}
    />
  );
}
