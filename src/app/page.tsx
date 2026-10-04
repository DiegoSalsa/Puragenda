import { ThemeNeoBrutalism } from "@/components/landing/ThemeNeoBrutalism";
import { WebsiteCommercialSection } from "@/components/website-commercial-section";
import { publicWebsiteAcquisitionEnabled } from "@/server/websites/public-acquisition";
import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import {
  jsonLdGraph,
  organizationNode,
  softwareApplicationNode,
  websiteNode,
} from "@/lib/json-ld";

const homeTitle = "Sistema de reservas online en Chile | Puragenda";
const homeDescription = "Agenda online para negocios en Chile: recibe reservas 24/7, cobra abonos, organiza tu negocio y consulta agenda, cobros y disponibilidad con Puri.";

export const metadata: Metadata = {
  ...createPageMetadata({ title: homeTitle, description: homeDescription, path: "/" }),
  title: { absolute: homeTitle },
};

export const revalidate = 3600;

export default async function HomePage() {
  return (
    <>
      <JsonLd data={jsonLdGraph([organizationNode(), websiteNode(), softwareApplicationNode(homeDescription)])} />
      <ThemeNeoBrutalism commercialSection={<WebsiteCommercialSection home enabled={publicWebsiteAcquisitionEnabled()} />} />
    </>
  );
}
