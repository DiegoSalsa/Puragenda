import type { Metadata } from "next";
import { LandingLayout } from "@/components/landing/landing-layout";
import { ContactPageContent } from "@/components/landing/contact-page-content";
import { createPageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return createPageMetadata({
    title: "Contacto y demostración de Puragenda",
    description: "Conversa con el equipo de Puragenda sobre reservas, abonos, migración o configuración. Atención directa en español para negocios en Chile.",
    path: "/contacto",
  });
}

export default function ContactoPage() {
  return (
    <LandingLayout>
      <ContactPageContent />
    </LandingLayout>
  );
}
