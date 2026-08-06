
import { LocalizedText } from "@/components/i18n/localized-text";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ChevronLeft } from "lucide-react";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad y protección de datos personales de Puragenda.",
  alternates: { canonical: absoluteUrl("/politica-de-privacidad") },
};

export default function PrivacidadPage() {
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
                <LocalizedText id="-jIqo26JQhOu" />
              </h1>
              <p className="mt-4 text-sm text-[#7C3AED] uppercase tracking-widest font-medium">
                <LocalizedText id="RlrmFTR10Hlj" />
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
              <h2><LocalizedText id="4J9I31Uf1b_H" /></h2>
              <p>
                <LocalizedText id="4Xpy66dI30T8" />
              </p>

              <h2><LocalizedText id="bo7QHUsrpl2Y" /></h2>

              <h3><LocalizedText id="VfkIg8IdakKw" /></h3>
              <ul>
                <li><LocalizedText id="DOksAPqTO9nS" /></li>
                <li><LocalizedText id="w6fWdnC6vMxL" /></li>
                <li><LocalizedText id="kNOwSnlh_4b5" /></li>
                <li><LocalizedText id="jInsz-wjGYZh" /></li>
              </ul>

              <h3><LocalizedText id="PTL4d5janQKn" /></h3>
              <ul>
                <li><LocalizedText id="2IJJQ-YAmczm" /></li>
                <li><LocalizedText id="TFnrde9AHl_-" /></li>
              </ul>

              <h3><LocalizedText id="CaaD-cIH5uX8" /></h3>
              <ul>
                <li><LocalizedText id="VcbR_YL6pJFp" /></li>
                <li><LocalizedText id="AUmEyBbWkYlc" /></li>
                <li><LocalizedText id="WobTAU9jNuWp" /></li>
              </ul>

              <h2><LocalizedText id="ZCYpqduQCcf7" /></h2>
              <p><LocalizedText id="HPZzGnJjcXst" /></p>
              <ul>
                <li><LocalizedText id="U5WPgJSNkTwM" /></li>
                <li><LocalizedText id="OCGEODQ9BA5L" /></li>
                <li><LocalizedText id="Af4srV6e4NVM" /></li>
                <li><LocalizedText id="KPaQW3rG8V2g" /></li>
                <li><LocalizedText id="qi4sbbgLk4-v" /></li>
                <li><LocalizedText id="Pma_zQmR9Uuy" /></li>
              </ul>

              <h2><LocalizedText id="Wt-PfIJvt4cd" /></h2>
              <p>
                <LocalizedText id="ikO9slrHiEgc" />
              </p>

              <h2><LocalizedText id="XUQ6YnR8kiTh" /></h2>
              <p><LocalizedText id="mF39R-sxINL8" /></p>
              <ul>
                <li><strong><LocalizedText id="0a3uHu7eqkLi" /></strong> <LocalizedText id="pBfAX6xsBcqU" /></li>
                <li><strong><LocalizedText id="JJHqwxOeXJyX" /></strong> <LocalizedText id="e4PC8Gcoyl7v" /></li>
                <li><strong><LocalizedText id="CXUNt7L62OYN" /></strong> <LocalizedText id="pZrE59u9nnVi" /></li>
              </ul>
              <p>
                <LocalizedText id="EELb1kD6pqTv" />
              </p>

              <h2><LocalizedText id="nYLtv7CQehjY" /></h2>
              <p>
                <LocalizedText id="aLE5TVKZ7RRq" />
              </p>
              <ul>
                <li><LocalizedText id="tp4aeko-Miat" /></li>
                <li><LocalizedText id="0rUUCN-l1Xut" /></li>
                <li><LocalizedText id="Kr1OKNQyQLG9" /></li>
              </ul>

              <h2><LocalizedText id="y92y3Qn-L2TS" /></h2>
              <p><LocalizedText id="rgPOxjN6T3OC" /></p>
              <ul>
                <li><LocalizedText id="IIbImOGer2Ww" /></li>
                <li><LocalizedText id="R3q6u3VCyFHZ" /></li>
                <li><LocalizedText id="cAPO3fq1jSiD" /></li>
                <li><LocalizedText id="6nmuvF_GMbtY" /></li>
                <li><LocalizedText id="ktMyB51N3Zve" /></li>
              </ul>
              <p>
                <LocalizedText id="0F08rp-YZ7Tz" />
              </p>

              <h2><LocalizedText id="c9zyCDABmN7a" /></h2>
              <p>
                <LocalizedText id="h3oD6LFsCJeF" />
              </p>

              <h2 id="google-calendar" className="scroll-mt-32"><LocalizedText id="3GM_qTuOKmLf" /></h2>

              <h3><LocalizedText id="tdXVzZau8Kk4" /></h3>
              <p>
                <LocalizedText id="anebBeBWtgtc" />
              </p>
              <ul>
                <li><LocalizedText id="dGOP01p5I0Jw" /></li>
                <li><LocalizedText id="ZT0tbZKtZKiN" /></li>
                <li><LocalizedText id="9EKIV6-xubAj" /></li>
                <li><LocalizedText id="ojn2pVoyTwV_" /></li>
              </ul>

              <h3><LocalizedText id="EcOHCN3ZKCqv" /></h3>
              <p>
                <LocalizedText id="_oPKqH98g6ZW" />
              </p>

              <h3><LocalizedText id="_UXc7oN_2xP_" /></h3>
              <p>
                <LocalizedText id="zL2YFZZYMgEY" />
              </p>

              <h3><LocalizedText id="hvU7PqtTbI3L" /></h3>
              <p>
                <LocalizedText id="Xp0a66TL6V04" />
              </p>
              <p lang="en">
                <LocalizedText id="vOV9GFToAxRx" />{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  <LocalizedText id="H9f9JFP0L4Tr" />
                </a><LocalizedText id="g0HRDV5DFDYk" />
              </p>

              <h3><LocalizedText id="-qLo0z-Qv3sl" /></h3>
              <p>
                <LocalizedText id="CvSPc4a0FnEy" />
              </p>
              <p>
                <LocalizedText id="yN47zeWJ5z_t" />{" "}
                <a href="https://myaccount.google.com/connections" target="_blank" rel="noreferrer">
                  <LocalizedText id="TJibwXxF44f3" />
                </a>.
              </p>

              <h2><LocalizedText id="vK9UPAf_LO34" /></h2>
              <p>
                <LocalizedText id="eArZoELEY3hx" />
              </p>

              <h2><LocalizedText id="af8tpeDTHFaP" /></h2>
              <p>
                <LocalizedText id="F0qmQxLxlBdc" />
              </p>

              <h2><LocalizedText id="oRH6scHWE1Au" /></h2>
              <p>
                <LocalizedText id="YsoWWonoNMp6" />{" "}
                <a href="mailto:contacto@purocode.com">contacto@purocode.com</a>.
              </p>
            </article>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
