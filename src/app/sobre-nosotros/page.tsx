
import { LocalizedText } from "@/components/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2 } from "@/components/icons/hover-icons";
import { LandingLayout } from "@/components/landing/landing-layout";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Sobre Puragenda y el equipo de PuroCode",
  description: "Conoce al equipo chileno detrás de Puragenda, la plataforma de reservas creada para negocios locales y profesionales de servicios.",
  path: "/sobre-nosotros",
});

export const revalidate = 3600;

export default async function AboutPage() {
  return (
    <LandingLayout>
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-8 text-center mb-16">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#7C3AED] dark:text-[#B28DFF] bg-[#FFF5BA] dark:bg-black border-2 border-black dark:border-white inline-block px-4 py-1 shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#FFFFFF]"><LocalizedText id="GQG8TPyrYsZC" /></p>
          <h1 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center">
            <LocalizedText id="0IyxI_tnaxsj" /> <br className="hidden sm:block" />
            <LocalizedText id="x6CNUX4arjJB" />
          </h1>
        </div>

        <article className="mt-20">
          <div className="grid gap-12 md:grid-cols-2 md:items-start">
            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase bg-[#85E3FF] border-2 border-black dark:border-white inline-block px-3 py-1 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] text-black"><LocalizedText id="7Ncc9y6QgRZZ" /></h2>
              <p className="text-lg font-bold leading-relaxed opacity-80">
                <LocalizedText id="p634YNsp6myz" />
              </p>
              <p className="text-lg font-bold leading-relaxed opacity-80">
                <LocalizedText id="eDyQ6Wf_apzl" />
              </p>
            </div>
            
            <div className="rounded-2xl border-4 border-black dark:border-white bg-[#FFB5E8] dark:bg-black p-8 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFB5E8] text-black dark:text-white">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black bg-white dark:bg-black text-black dark:text-white shadow-[4px_4px_0_#000]">
                <Code2 className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-black uppercase"><LocalizedText id="W9PCHbBv2nN1" /></h2>
              <p className="mt-4 font-bold leading-relaxed opacity-80">
                <LocalizedText id="9I7PGnOxFuWP" />
              </p>
              <p className="mt-4 font-bold leading-relaxed opacity-80">
                <LocalizedText id="FR12jluEq-rt" />
              </p>
            </div>
          </div>

          <div className="mt-20 border-t-4 border-black dark:border-white pt-20">
            <h2 className="text-center text-4xl font-black uppercase mb-16"><LocalizedText id="F02w61460Tk-" /></h2>
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-gradient-to-b before:from-transparent before:via-black dark:before:via-white before:to-transparent">
              {/* Event 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#FFB5E8] shadow-[4px_4px_0_#000] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <div className="font-black text-black">1</div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black uppercase text-xl"><LocalizedText id="n3RZ0c2ccTx-" /></h3>
                    <time className="font-bold opacity-60">2024</time>
                  </div>
                  <p className="font-bold opacity-80"><LocalizedText id="1addc5hF7n2W" /></p>
                </div>
              </div>
              
              {/* Event 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#85E3FF] shadow-[4px_4px_0_#000] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <div className="font-black text-black">2</div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black uppercase text-xl"><LocalizedText id="VrF44eoBu1NB" /></h3>
                    <time className="font-bold opacity-60">2025</time>
                  </div>
                  <p className="font-bold opacity-80"><LocalizedText id="RaAzvOAkPtfY" /></p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-[#FFF5BA] shadow-[4px_4px_0_#000] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                   <div className="font-black text-black">3</div>
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-black border-4 border-black dark:border-white p-6 rounded-2xl shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF]">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black uppercase text-xl"><LocalizedText id="qzVpJwMmR-YY" /></h3>
                    <time className="font-bold opacity-60">2026</time>
                  </div>
                  <p className="font-bold opacity-80"><LocalizedText id="LlW-J-wKcnvF" /></p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-20 border-t-4 border-black dark:border-white pt-20">
            <h2 className="text-center text-3xl font-black uppercase"><LocalizedText id="DDWFCltLnThQ" /></h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] rounded-xl hover:-translate-y-1 transition-transform">
                <h3 className="text-xl font-black uppercase text-black dark:text-white bg-[#BFFCC6] dark:bg-transparent dark:border-b-4 inline-block px-2 mb-3"><LocalizedText id="H7f1LNqFdiC9" /></h3>
                <p className="font-bold opacity-80 text-sm"><LocalizedText id="-KeqKZlzAQ3L" /></p>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] rounded-xl hover:-translate-y-1 transition-transform">
                <h3 className="text-xl font-black uppercase text-black dark:text-white bg-[#FFF5BA] dark:bg-transparent dark:border-b-4 inline-block px-2 mb-3"><LocalizedText id="cnz99Bg0UU67" /></h3>
                <p className="font-bold opacity-80 text-sm"><LocalizedText id="2qLG5jU-ZF1A" /></p>
              </div>
              <div className="bg-white dark:bg-black border-4 border-black dark:border-white p-6 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFFFF] rounded-xl hover:-translate-y-1 transition-transform">
                <h3 className="text-xl font-black uppercase text-black dark:text-white bg-[#85E3FF] dark:bg-transparent dark:border-b-4 inline-block px-2 mb-3"><LocalizedText id="DR1TMoyo8U2H" /></h3>
                <p className="font-bold opacity-80 text-sm"><LocalizedText id="sYhv0Cp5GprX" /></p>
              </div>
            </div>
          </div>
        </article>

        <div className="mt-20 border-t-4 border-black dark:border-white pt-12 text-center space-y-6">
          <p className="text-xl font-black uppercase opacity-70"><LocalizedText id="1CcZ8q9J0O6q" /></p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="flex items-center gap-2 bg-[#FFB5E8] text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all">
                <LocalizedText id="k4Z5q8KEHh5f" /> <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all">
                <LocalizedText id="WafzZ-nQbTje" />
              </button>
            </Link>
          </div>
          <p className="text-sm font-bold opacity-60"><LocalizedText id="0XlRQfxgHDRt" /></p>
        </div>
      </main>
    </LandingLayout>
  );
}
