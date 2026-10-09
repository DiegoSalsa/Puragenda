import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DynaPuff, Caveat } from "next/font/google";
import { NOT_FOUND_ROBOTS } from "@/lib/crawler-policy";
import { pinkFixtureView } from "@/websites/fixtures/pink-y2k";
import { pinkPrototypeAllowed } from "@/websites/templates/pink-y2k/access";
import Prototype from "@/websites/templates/pink-y2k/Prototype";
const display = DynaPuff({
  subsets: ["latin"],
  variable: "--pink-display",
  display: "swap",
});
const handwriting = Caveat({
  subsets: ["latin"],
  variable: "--pink-hand",
  display: "swap",
});
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Y2K · Vista previa privada" },
  description: "Pink Digital Dream · revisión local de Puragenda",
  robots: NOT_FOUND_ROBOTS,
  openGraph: { images: [] },
  twitter: { images: [] },
  icons: { icon: "/websites/pink-y2k/favicon.svg" },
};
export default async function PinkPreview() {
  if (
    !pinkPrototypeAllowed(
      process.env.NODE_ENV,
      process.env.WEBSITE_PINK_Y2K_PREVIEW,
      (await headers()).get("host"),
    )
  )
    notFound();
  return (
    <div className={`${display.variable} ${handwriting.variable}`}>
      <Prototype view={pinkFixtureView()} />
    </div>
  );
}
