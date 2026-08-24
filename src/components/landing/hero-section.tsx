
import { LocalizedText } from "@/components/i18n/localized-text";
import Link from "next/link";
import { ArrowRight, Scissors, Sparkles, Stethoscope, ShieldCheck } from "@/components/icons/hover-icons";
import { WordCarousel } from "@/components/landing/word-carousel";

export function HeroSection() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-6 pb-20 pt-32 md:pt-40 lg:pt-48">
      
      {/* Background Orbs & Glow - Kept within Hero for modularity */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] md:top-[10%] -left-20 md:-left-10 h-[20rem] w-[20rem] md:h-[35rem] md:w-[35rem] rounded-full bg-[#7C3AED]/15 md:bg-[#7C3AED]/20 blur-[40px] md:blur-[80px] lg:blur-[110px] dark:bg-[#7C3AED]/15 dark:md:bg-[#7C3AED]/25" />
        <div className="absolute top-[30%] -right-20 md:-right-10 h-[25rem] w-[25rem] md:h-[45rem] md:w-[45rem] rounded-full bg-[#E91E8C]/5 md:bg-[#E91E8C]/10 blur-[40px] md:blur-[100px] lg:blur-[130px] dark:bg-[#E91E8C]/10 dark:md:bg-[#E91E8C]/15" />
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
        
        {/* Left Column: Content */}
        <div className="animate-fade-up space-y-8 lg:w-1/2 relative z-10 text-center lg:text-left">
          
          <div className="inline-flex items-center rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-3 py-1 text-sm font-medium text-[#7C3AED] backdrop-blur-sm shadow-[0_0_15px_rgba(124,58,237,0.15)] mb-4">
            <span className="flex h-2 w-2 rounded-full bg-[#7C3AED] mr-2 animate-pulse" />
            <LocalizedText id="MolWB7Y0b8pL" />
          </div>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl drop-shadow-sm">
            <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent"><LocalizedText id="D-IdVfIbRd9D" /></span><br/>
            <span className="bg-gradient-to-br from-[#7C3AED] to-[#E91E8C] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(124,58,237,0.3)]"><LocalizedText id="UtNwE9aCe2m7" /></span> <br />
            <WordCarousel />
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl mx-auto lg:mx-0">
            <LocalizedText id="eb_R1f76sXGb" />
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <button className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#7C3AED] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all duration-300 hover:bg-[#6D28D9] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                <span className="relative z-10 flex items-center gap-2">
                  <LocalizedText id="NqC0Mo3B6h7f" /> <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </Link>
            <a href="/api/auth/demo" className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/40 px-8 py-3.5 text-sm font-semibold text-foreground backdrop-blur-xl transition-all hover:bg-muted/60 hover:border-border shadow-sm">
                <LocalizedText id="vP-8OnnRFj1a" />
              </button>
            </a>
          </div>

          <p className="text-xs text-muted-foreground/60 font-medium"><LocalizedText id="0-9SNZCT992I" /></p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2">
            {[
              { icon: Scissors, label: "Peluquerías" },
              { icon: Sparkles, label: "Estética" },
              { icon: Stethoscope, label: "Clínicas" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-full border border-border/50 bg-card/30 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm hover:border-[#7C3AED]/30 transition-colors cursor-default">
                <item.icon className="h-4 w-4 text-[#7C3AED]" />
                {item.label}
              </div>
            ))}
          </div>

          {/* MercadoPago trust badge */}
          <div className="flex items-center justify-center lg:justify-start gap-2 pt-1">
            <div className="flex items-center gap-2.5 rounded-full border border-[#009EE3]/25 bg-[#009EE3]/8 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#009EE3]" />
              <LocalizedText id="rUqE0iBhItxM" />
              <span className="font-bold text-[#009EE3]"><LocalizedText id="OHWtjcFBNX8d" /></span>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Visual / Mockup (Glassmorphism card) */}
        <div className="lg:w-1/2 w-full relative perspective-[2000px]">
          <div className="relative w-full aspect-[4/3] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl overflow-hidden transform rotate-y-[-10deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700 ease-out flex items-center justify-center group">
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            {/* Mockup content */}
            <div className="w-4/5 h-4/5 rounded-xl border border-border/40 bg-background/80 shadow-inner flex flex-col overflow-hidden">
              <div className="h-10 w-full border-b border-border/40 bg-muted/20 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto w-1/2 h-4 rounded bg-background border border-border/50" />
              </div>
              <div className="flex-1 p-6 flex flex-col gap-4">
                <div className="w-1/3 h-6 rounded bg-[#7C3AED]/20 animate-pulse" />
                <div className="w-full h-24 rounded-lg bg-card border border-border/50 shadow-sm flex items-center p-4 gap-4">
                   <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                   <div className="space-y-2 flex-1">
                     <div className="w-1/2 h-4 rounded bg-muted animate-pulse" />
                     <div className="w-1/4 h-3 rounded bg-muted/50 animate-pulse" />
                   </div>
                </div>
                <div className="w-full h-24 rounded-lg bg-card border border-border/50 shadow-sm flex items-center p-4 gap-4">
                   <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                   <div className="space-y-2 flex-1">
                     <div className="w-3/4 h-4 rounded bg-muted animate-pulse" />
                     <div className="w-1/3 h-3 rounded bg-muted/50 animate-pulse" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
