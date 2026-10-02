"use client";
import { useDashboardOverlay } from "./dashboard-overlay-context";
import { websiteLaunchMessage, type WebsiteLaunchContext } from "@/websites/launch";
export default function WebsiteChangelogCard({ context }: { context: WebsiteLaunchContext }) {
  const { setChangelogOpen } = useDashboardOverlay();
  const message = websiteLaunchMessage(context.offer, context.addon);
  return <aside className="rounded-2xl border-[3px] border-black bg-[#FFF5BA] p-5 text-black"><p className="font-black">{message.showFounderOffer ? "Tu beneficio fundador: 15 días gratis. Después, si decides quedártela:" : "Sitio Web Puragenda"} {message.price}</p><a className="mt-3 inline-block rounded-lg bg-black px-5 py-3 font-bold text-white" href="/dashboard/website">{message.cta}</a><button className="ml-4 mt-3 underline" onClick={() => setChangelogOpen(true)}>Ver anuncio de Sitio Web</button></aside>;
}
