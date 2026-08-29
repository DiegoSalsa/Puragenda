
import { LocalizedText } from "@/components/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ChevronLeft } from "@/components/icons/hover-icons";
import { absoluteUrl } from "@/lib/site";
import { getLocale } from "next-intl/server";
import { getTermsNotice } from "@/lib/privacy/tracking-notice";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso de la plataforma Puragenda.",
  alternates: { canonical: absoluteUrl("/terminos-y-condiciones") },
};

export default async function TerminosPage() {
  const notice = getTermsNotice(await getLocale());
  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-[#7C3AED]/30">
      <Navbar />
      
      <main className="relative overflow-hidden pt-24 lg:pt-32 pb-20">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7C3AED]/10 blur-[120px]" />
        
        <div className="mx-auto w-full max-w-4xl px-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#7C3AED] transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" /> <LocalizedText id="OQbDhyWfr8QA" />
          </Link>

          <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-2xl p-8 shadow-2xl sm:p-12 md:p-16 relative">
            {/* Subtle inner border glow */}
            <div className="absolute inset-0 -z-10 rounded-3xl ring-1 ring-inset ring-white/5" />
            
            <header className="mb-12 border-b border-border/50 pb-8 text-center sm:text-left">
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
                <LocalizedText id="uhStBvjh28Mg" />
              </h1>
              <p className="mt-4 text-sm text-[#7C3AED] uppercase tracking-widest font-medium">
                <LocalizedText id="KGTlDvlp8CKt" />
              </p>
            </header>

            <article className="
              text-base text-muted-foreground leading-relaxed
              [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-6
              [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-4
              [&_p]:mb-6
              [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-3 [&_ul]:mb-6 [&_ul]:marker:text-[#7C3AED]
              [&_li]:pl-2
              [&_a]:text-[#7C3AED] hover:[&_a]:text-[#A78BFA] [&_a]:underline [&_a]:transition-colors
              [&_strong]:text-foreground [&_strong]:font-semibold
            ">
              <h2><LocalizedText id="jOfGxiiMWFYm" /></h2>
              <p>
                <LocalizedText id="prGRTcfxsuCH" />
              </p>

              <h2><LocalizedText id="deq_4_BtrkrB" /></h2>
              <p>
                <LocalizedText id="2n6zO6faULKF" />
              </p>

              <h3><LocalizedText id="hkXHEM9t17lZ" /></h3>
              <ul>
                <li><LocalizedText id="qG_hIlQ8iQ_e" /></li>
                <li><LocalizedText id="eBOqFaGfr10B" /></li>
                <li><LocalizedText id="9BfgfzwdU516" /></li>
                <li><LocalizedText id="Jy0i7Ke5sySS" /></li>
                <li><LocalizedText id="q70437XJJgV8" /></li>
              </ul>

              <h2>{notice.heading}</h2>
              <p>{notice.description}</p>
              <p><Link href="/politica-de-privacidad">{notice.privacyLink}</Link>.</p>

              <h2><LocalizedText id="g5BahbfsJndg" /></h2>
              <p>
                <LocalizedText id="0XLde9-kl66M" />
              </p>

              <h2><LocalizedText id="nKqP5gicGu1C" /></h2>
              <p>
                <LocalizedText id="ELxTTb44womF" />
              </p>
              <p>
                <strong><LocalizedText id="3AxUY2q5lo5U" /></strong> <LocalizedText id="uR4flolgoHXg" /> <strong>Mercado Pago</strong><LocalizedText id="hM5SdqrWhaIP" />
              </p>

              <h2><LocalizedText id="eZg_EFB3xMOs" /></h2>
              <p><LocalizedText id="0H95DFsg0SU0" /></p>
              <ul>
                <li><LocalizedText id="5jsspjh2q2Ba" /></li>
                <li><LocalizedText id="XIGHwymkRlSK" /></li>
                <li><LocalizedText id="wH1bCw4-JEOb" /></li>
                <li><LocalizedText id="NijUNtZdssf_" /></li>
              </ul>

              <h2><LocalizedText id="MT59Q_8OLydn" /></h2>
              <p>
                <LocalizedText id="zwK3P29EJz87" />
              </p>

              <h2><LocalizedText id="nGRScWubyXBw" /></h2>
              <p>
                <LocalizedText id="0yYEhCj_lNcn" />
              </p>

              <h2><LocalizedText id="SJdvA5Ty0xVw" /></h2>
              <p>
                <LocalizedText id="skHys6sxOt8y" />
              </p>

              <h2><LocalizedText id="aTcElJBECg0s" /></h2>
              <p>
                <LocalizedText id="f7k1gLFu_h5t" />
              </p>

              <h2><LocalizedText id="q178-PXXTsSJ" /></h2>
              <p>
                <LocalizedText id="41hv-MgzNFVg" />
              </p>

              <h2><LocalizedText id="AJ8323mbJw1Y" /></h2>
              <p>
                <LocalizedText id="4X4EZZxNRueh" /> <a href="mailto:contacto@purocode.com">contacto@purocode.com</a>.
              </p>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
