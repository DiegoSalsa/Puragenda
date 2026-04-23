import { prisma } from "@/backend/db/prisma";
import { Badge } from "@/frontend/components/ui/badge";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { WidgetClient } from "./widget-client";

export const dynamic = "force-dynamic";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      services: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-purple-900/25 p-5">
        <Card className="mx-auto mt-10 w-full max-w-lg rounded-3xl border-border/70 bg-card/80 shadow-lg shadow-black/20">
          <CardContent className="space-y-3 p-6 text-center">
            <Badge variant="outline" className="border-white/35 text-white">
              Widget de reservas
            </Badge>
            <p className="text-xl font-semibold tracking-tight">Negocio no encontrado</p>
            <p className="text-sm text-muted-foreground">
              El identificador &ldquo;{slug}&rdquo; no existe o ya no esta disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <WidgetClient
      business={{
        name: business.name,
        slug: business.slug,
        apiKey: business.apiKey,
      }}
      services={business.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
      }))}
    />
  );
}
