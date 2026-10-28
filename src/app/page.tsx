import { ThemeNeoBrutalism } from "@/components/landing/ThemeNeoBrutalism";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import {
  jsonLdGraph,
  organizationNode,
  softwareApplicationNode,
  websiteNode,
} from "@/lib/json-ld";
import { PuragendaPlusHomeSection } from "@/components/puragenda-plus-section";

const homeTitle = "Sistema de reservas online en Chile | Puragenda";
const homeDescription = "Agenda online en Chile: reservas 24/7, clientes y Puri. Puragenda+ suma sitio web, inteligencia comercial y Contact Flow. Prueba 30 días sin tarjeta.";

export const metadata: Metadata = {
  ...createPageMetadata({ title: homeTitle, description: homeDescription, path: "/" }),
  title: { absolute: homeTitle },
};

export const revalidate = 3600;

export default async function HomePage() {
  return (
    <>
      <JsonLd data={jsonLdGraph([organizationNode(), websiteNode(), softwareApplicationNode(homeDescription)])} />
      <ThemeNeoBrutalism commercialSection={<PuragendaPlusHomeSection />} />
    </>
  );
}
