import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";
import { NOT_FOUND_ROBOTS } from "@/lib/crawler-policy";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "Esta dirección no existe o ya no está disponible.",
  robots: NOT_FOUND_ROBOTS,
  alternates: { canonical: null },
  openGraph: {
    title: "Página no encontrada",
    description: "Esta dirección no existe o ya no está disponible.",
  },
  twitter: {
    card: "summary",
    title: "Página no encontrada",
    description: "Esta dirección no existe o ya no está disponible.",
  },
};

export default function NotFound() {
  return <NotFoundContent />;
}
