import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, CalendarClock, Scissors, Sparkles, Stethoscope, Users, Palette, Shield, CreditCard } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { WordCarousel } from "@/components/landing/word-carousel";
import type { LandingIdentityProps } from "@/components/landing/types";

const Footer = dynamic(() => import("@/components/landing/footer").then((m) => m.Footer), { ssr: true });

const stitchVars: React.CSSProperties & Record<string, string> = {
  "--primary": "#FF4500",
  "--primary-foreground": "#FFFFFF",
  "--secondary": "#FFDB58",
  "--secondary-foreground": "#000000",
  "--accent": "#FF1493",
  "--accent-foreground": "#FFFFFF",
  "--ring": "#FF4500",
};

export function Theme70s({ user, business }: LandingIdentityProps) {
  return (
    <div className="relative min-h-screen w-full font-sans overflow-hidden bg-[#FFFDD0] text-[#000] dark:bg-[#1A1A1D] dark:text-[#FFFDD0] transition-colors duration-300" style={{ ...stitchVars, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Halftone Texture Overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.08] dark:opacity-[0.05]" style={{ backgroundImage: "var(--halftone-color, radial-gradient(#000 20%, transparent 20%), radial-gradient(#000 20%, transparent 20%))", backgroundSize: "16px 16px", backgroundPosition: "0 0, 8px 8px" }} />
      <style dangerouslySetInnerHTML={{__html: `
        :root { --halftone-color: radial-gradient(#000 20%, transparent 20%), radial-gradient(#000 20%, transparent 20%); }
        .dark { --halftone-color: radial-gradient(#FFFDD0 20%, transparent 20%), radial-gradient(#FFFDD0 20%, transparent 20%); }
      `}} />

      <div className="relative z-50 border-b-[4px] border-black dark:border-[#FFFDD0] bg-[#FFFDD0] dark:bg-[#1A1A1D]">
        <Navbar user={user} business={business} />
      </div>

      <main className="relative z-10">
        {/* HERO */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-32 md:pt-40 lg:pt-48 relative">
          <div className="space-y-8 text-center relative z-10">
            {/* Differentiator tags */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="bg-[#FFDB58] border-[3px] border-black dark:border-[#FFFDD0] text-black text-sm font-black uppercase px-4 py-1.5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] -rotate-2 tracking-wide">✓ Sin comisiones</span>
              <span className="bg-[#FF1493] border-[3px] border-black dark:border-[#FFFDD0] text-white text-sm font-black uppercase px-4 py-1.5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] rotate-2 tracking-wide">✓ 30 días gratis</span>
              <span className="bg-[#FF4500] border-[3px] border-black dark:border-[#FFFDD0] text-white text-sm font-black uppercase px-4 py-1.5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] -rotate-1 tracking-wide">✓ Sin contrato</span>
            </div>
            
            <h1 className="mx-auto max-w-5xl text-6xl font-black leading-[1.05] tracking-tighter sm:text-7xl lg:text-[6.5rem] uppercase" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              <span className="inline-block transform -rotate-1 text-[#FF4500] drop-shadow-[4px_4px_0_#000] dark:drop-shadow-[4px_4px_0_#FFFDD0] filter">Tu Agenda</span><br />
              <span className="inline-block transform -rotate-1 text-[#FF4500] drop-shadow-[4px_4px_0_#000] dark:drop-shadow-[4px_4px_0_#FFFDD0] filter">Online</span><br />
              <span className="inline-block transform rotate-1 mt-4 text-black bg-[#FFDB58] px-4 border-[4px] border-black dark:border-[#FFFDD0] shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0]">
                <WordCarousel words={["PURAGENDA.", "INTELIGENTE.", "AUTOMÁTICO.", "24/7 ONLINE.", "SIN ESTRÉS."]} />
              </span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-xl font-bold leading-relaxed text-black/80 dark:text-[#FFFDD0]/80 mt-10">
              Recibe reservas sin tocar el WhatsApp, cobra abonos online y lleva el control de tu negocio desde un solo lugar.
            </p>
            
            <div className="mx-auto mt-12 flex flex-col justify-center gap-6 sm:flex-row items-center">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF4500] px-10 py-5 text-xl font-black text-white shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_#000] dark:hover:shadow-[4px_4px_0_#FFFDD0] transition-all flex items-center justify-center gap-3 uppercase">
                  Empezar Gratis <ArrowRight className="h-6 w-6 stroke-[3px]" />
                </button>
              </Link>
              <a href="/api/auth/demo" className="w-full sm:w-auto group relative">
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#32CD32] border-[3px] border-black dark:border-[#FFFDD0] text-black text-xs font-black uppercase px-3 py-1 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] whitespace-nowrap z-10 rotate-3">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block" />
                  En vivo
                </span>
                <button className="w-full sm:w-auto rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFFDD0] dark:bg-[#1A1A1D] px-10 py-5 text-xl font-black uppercase text-black dark:text-[#FFFDD0] shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_#000] dark:hover:shadow-[4px_4px_0_#FFFDD0] transition-all hover:bg-[#1A1A1D] dark:hover:bg-white hover:text-white dark:hover:text-black flex items-center justify-center gap-2">
                  ▶ Ver Demo
                </button>
              </a>
            </div>

            <p className="mt-8 text-base font-bold text-black/80 dark:text-[#FFFDD0]/80 uppercase tracking-wide text-center">
              Sin tarjeta de crédito – Configura en 2 minutos – Cancela cuando quieras
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF1493] px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] hover:-translate-y-1 transition-transform rotate-2">
                <Scissors className="h-5 w-5" /> Peluquerías
              </div>
              <div className="flex items-center gap-2 border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFDB58] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] hover:-translate-y-1 transition-transform -rotate-1">
                <Sparkles className="h-5 w-5" /> Estética
              </div>
              <div className="flex items-center gap-2 border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF4500] px-5 py-3 text-sm font-black uppercase text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] hover:-translate-y-1 transition-transform rotate-1">
                <Stethoscope className="h-5 w-5" /> Clínicas
              </div>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="absolute top-20 left-10 w-24 h-24 rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF1493] shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFDD0] pointer-events-none animate-bounce" style={{ animationDuration: "3s" }} />
          <div className="absolute bottom-20 right-10 w-32 h-32 rounded-lg border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFDB58] shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFDD0] rotate-12 pointer-events-none" />
        </section>

        {/* PRODUCT SHOWCASE / MOCKUPS */}
        <section id="como-funciona" className="border-y-[4px] border-black dark:border-[#FFFDD0] bg-[#FF4500] dark:bg-[#2A2A2E] py-24 relative overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-6 relative z-10 space-y-12">
            <div className="text-center">
              <h2 className="text-4xl font-black tracking-tight sm:text-6xl text-center uppercase text-white dark:text-[#FFFDD0] drop-shadow-[6px_6px_0_#000] dark:drop-shadow-[6px_6px_0_#FF4500]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Todo lo que necesitas, en un solo lugar
              </h2>
            </div>

            {/* Main showcase: Widget + Dashboard */}
            <div className="grid gap-8 lg:grid-cols-5 relative">
              
              {/* Widget Preview - col 1-2 */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-[2rem] border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFFDD0] dark:bg-[#1A1A1D] p-6 shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#FFFDD0] transition-transform hover:-translate-y-2">
                <div className="relative flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black dark:text-[#FFFDD0] mb-6">
                  <div className="h-4 w-4 rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF1493] animate-pulse" />
                  Vista del cliente
                </div>
                
                {/* Fake widget mockup */}
                <div className="rounded-3xl border-[4px] border-black dark:border-[#FFFDD0] bg-white dark:bg-[#2A2A2E] p-6 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#1A1A1D]">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60 dark:text-[#FFFDD0]/60">Reserva online</p>
                      <p className="text-xl font-black text-black dark:text-[#FFFDD0]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Estética Bella</p>
                    </div>
                    <span className="rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFDB58] px-3 py-1 text-[10px] font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFDD0] rotate-2">Paso a paso</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF1493] px-2 py-2 text-center text-[10px] font-black uppercase text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#1A1A1D]">Servicio</div>
                    <div className="rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFDB58] px-2 py-2 text-center text-[10px] font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#1A1A1D]">Fecha</div>
                    <div className="rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-white dark:bg-[#1A1A1D] px-2 py-2 text-center text-[10px] font-black uppercase text-black dark:text-[#FFFDD0]">Datos</div>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="rounded-2xl border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFDB58] p-4 shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#1A1A1D] rotate-[-1deg]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-black text-black uppercase" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Corte de pelo</p>
                          <div className="mt-1 flex gap-2 text-[12px] font-bold text-black/80">
                            <span>30 min</span>
                            <span className="bg-white px-2 rounded-full border-[2px] border-black">$15.000</span>
                          </div>
                        </div>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-[4px] border-black bg-[#FF1493] text-white font-black text-[14px] shadow-[4px_4px_0_#000]">✓</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border-[4px] border-black/20 dark:border-[#FFFDD0]/30 bg-gray-50 dark:bg-gray-800 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-black text-black/40 dark:text-[#FFFDD0]/50 uppercase" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Manicure Gel</p>
                          <div className="mt-1 flex gap-2 text-[12px] font-bold text-black/40 dark:text-[#FFFDD0]/50">
                            <span>60 min</span>
                            <span>$25.000</span>
                          </div>
                        </div>
                        <div className="h-8 w-8 rounded-full border-[4px] border-black/20 dark:border-[#FFFDD0]/30" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d, i) => (
                      <div key={d} className={`rounded-xl border-[4px] border-black dark:border-[#FFFDD0] px-1 py-2 text-center text-[10px] ${i === 1 ? "bg-[#FF1493] text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#1A1A1D] -translate-y-1" : "bg-white dark:bg-[#1A1A1D] text-black dark:text-[#FFFDD0]"}`}>
                        <p className={`font-black uppercase tracking-widest ${i === 1 ? "text-white" : "text-black/60 dark:text-[#FFFDD0]/60"}`}>{d}</p>
                        <p className="text-lg font-black mt-1">{14 + i}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {["10:00", "10:30", "11:00", "11:30"].map((t, i) => (
                      <div key={t} className={`rounded-full border-[4px] border-black dark:border-[#FFFDD0] px-1 py-2 text-center text-[11px] font-black ${i === 2 ? "bg-[#FF4500] text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#1A1A1D] scale-110" : "bg-white dark:bg-[#1A1A1D] text-black/60 dark:text-[#FFFDD0]/60"}`}>
                        {t}
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t-[4px] border-black/10 dark:border-[#FFFDD0]/20 pt-4 text-center text-[10px] font-black uppercase tracking-widest text-black/50 dark:text-[#FFFDD0]/50">
                    PurAgenda Powered by PuroCode
                  </div>
                </div>
              </div>

              {/* Dashboard Preview - col 3-5 */}
              <div className="lg:col-span-3 relative overflow-hidden rounded-[2rem] border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFDB58] dark:bg-[#1A1A1D] p-6 shadow-[12px_12px_0_#000] dark:shadow-[12px_12px_0_#FFFDD0] transition-transform hover:-translate-y-2">
                <div className="relative flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black dark:text-[#FFFDD0] mb-6">
                  <div className="h-4 w-4 rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF4500] animate-pulse" />
                  Panel de administración · Vista del dueño
                </div>
                
                {/* Fake dashboard */}
                <div className="rounded-3xl border-[4px] border-black dark:border-[#FFFDD0] bg-white dark:bg-[#2A2A2E] overflow-hidden shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#1A1A1D]">
                  {/* Top bar */}
                  <div className="flex items-center gap-4 border-b-[4px] border-black dark:border-[#FFFDD0] px-5 py-4 bg-[#FFFDD0] dark:bg-[#1A1A1D]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF1493] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] rotate-[-5deg]">
                      <CalendarClock className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-black uppercase tracking-tight text-black dark:text-[#FFFDD0]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                      Puragenda
                    </span>
                    <div className="ml-auto flex gap-2">
                      {["Citas", "Staff", "Servicios"].map((t) => (
                        <span key={t} className={`rounded-full border-[4px] border-black dark:border-[#FFFDD0] px-3 py-1.5 text-[10px] font-black uppercase ${t === "Citas" ? "bg-[#FFDB58] text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E]" : "bg-white dark:bg-[#2A2A2E] text-black dark:text-[#FFFDD0]"}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 p-5">
                    {[
                      { label: "Hoy", value: "8", sub: "citas", bg: "bg-[#FF1493]", text: "text-white" },
                      { label: "Semana", value: "34", sub: "reservas", bg: "bg-[#FF4500]", text: "text-white" },
                      { label: "Check-in", value: "92%", sub: "asistencia", bg: "bg-[#FFFDD0]", text: "text-black" },
                    ].map((stat, i) => (
                      <div key={stat.label} className={`rounded-2xl border-[4px] border-black dark:border-[#FFFDD0] px-4 py-3 ${stat.bg} shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#1A1A1D] ${i === 1 ? "rotate-2" : i === 2 ? "-rotate-1" : ""}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${stat.text} opacity-80`}>{stat.label}</p>
                        <p className={`text-4xl font-black ${stat.text} leading-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.3)]`} style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{stat.value}</p>
                        <p className={`text-[10px] font-bold uppercase ${stat.text} opacity-70`}>{stat.sub}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar/Appointments list */}
                  <div className="px-5 pb-5 space-y-3">
                    <p className="text-[12px] font-black uppercase tracking-widest text-black/50 dark:text-[#FFFDD0]/50 mb-3">Próximas citas</p>
                    {[
                      { name: "Juan Pérez", service: "Consultoría Web", time: "10:00", staff: "Diego S.", status: "confirmed", color: "bg-[#FFDB58]" },
                      { name: "María González", service: "Desarrollo Landing", time: "11:00", staff: "Diego S.", status: "pending", color: "bg-[#FF4500]" },
                      { name: "Ana Torres", service: "Consultoría Web", time: "15:00", staff: "Camila R.", status: "checked", color: "bg-[#FF1493]" },
                    ].map((apt) => (
                      <div key={apt.name} className="flex items-center justify-between rounded-2xl border-[4px] border-black dark:border-[#FFFDD0] bg-white dark:bg-[#1A1A1D] px-4 py-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] hover:translate-x-1 transition-transform">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-[4px] border-black ${apt.color} text-[14px] font-black text-black shadow-[4px_4px_0_#000] -rotate-6`}>
                            {apt.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[13px] font-black uppercase text-black dark:text-[#FFFDD0]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{apt.name}</p>
                            <p className="text-[10px] font-bold text-black/60 dark:text-[#FFFDD0]/60 uppercase">{apt.service} · {apt.staff}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-[#FFFDD0] dark:bg-[#2A2A2E] border-[4px] border-black dark:border-[#FFFDD0] px-3 py-1 rounded-full shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#1A1A1D]">
                          <span className="text-[12px] font-black text-black dark:text-[#FFFDD0]">{apt.time}</span>
                          <div className={`h-4 w-4 rounded-full border-[4px] border-black dark:border-[#FFFDD0] ${apt.status === "confirmed" ? "bg-[#32CD32]" : apt.status === "pending" ? "bg-[#FFDB58]" : "bg-[#FF1493]"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary showcase: feature cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[2rem] border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFFDD0] dark:bg-[#1A1A1D] p-6 space-y-4 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF1493] p-2 rounded-xl border-[4px] border-black dark:border-[#FFFDD0] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] rotate-6">
                    <Palette className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-xl font-black uppercase text-black dark:text-[#FFFDD0] leading-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Personalización</p>
                </div>
                <p className="text-sm font-bold text-black/80 dark:text-[#FFFDD0]/80">Cada negocio define sus colores. El widget se adapta a su marca.</p>
                <div className="flex gap-2 pt-2">
                  {["#FF4500", "#FF1493", "#FFDB58", "#32CD32", "#FFFDD0"].map((c, i) => (
                    <div key={c} className={`h-8 w-8 rounded-full border-[4px] border-black dark:border-[#FFFDD0] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] ${i % 2 === 0 ? "rotate-12" : "-rotate-12"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              
              <div className="rounded-[2rem] border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFFDD0] dark:bg-[#1A1A1D] p-6 space-y-4 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FFDB58] p-2 rounded-xl border-[4px] border-black dark:border-[#FFFDD0] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] -rotate-6">
                    <Users className="h-6 w-6 text-black" />
                  </div>
                  <p className="text-xl font-black uppercase text-black dark:text-[#FFFDD0] leading-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Multi-profesional</p>
                </div>
                <p className="text-sm font-bold text-black/80 dark:text-[#FFFDD0]/80">Cada staff tiene su propio horario y agenda independiente.</p>
                <div className="flex -space-x-3 pt-2">
                  {["D", "C", "M", "V"].map((letter, i) => (
                    <div key={letter} className="flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-black dark:border-[#FFFDD0] text-[12px] font-black text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E]" style={{ background: ["#FF4500", "#FF1493", "#FFDB58", "#FFFDD0"][i], zIndex: 4 - i, transform: `rotate(${i % 2 === 0 ? 10 : -10}deg)` }}>
                      {letter}
                    </div>
                  ))}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-white text-[12px] font-black text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E]">+3</div>
                </div>
              </div>
              
              <div className="rounded-[2rem] border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFFDD0] dark:bg-[#1A1A1D] p-6 space-y-4 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FF4500] p-2 rounded-xl border-[4px] border-black dark:border-[#FFFDD0] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] rotate-3">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-xl font-black uppercase text-black dark:text-[#FFFDD0] leading-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Sin solapamientos</p>
                </div>
                <p className="text-sm font-bold text-black/80 dark:text-[#FFFDD0]/80">Detección automática de colisiones. Nunca dos citas iguales.</p>
                <div className="space-y-3 text-[11px] font-black uppercase tracking-wide pt-2">
                  <div className="flex items-center gap-2 rounded-xl border-[4px] border-black dark:border-[#FFFDD0] bg-[#32CD32] px-3 py-2 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E]">
                    <div className="h-3 w-3 rounded-full border-[2px] border-black dark:border-[#FFFDD0] bg-white" />
                    <span className="text-black">10:00 - 11:00</span>
                    <span className="ml-auto text-black/80">OK</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border-[4px] border-black/40 dark:border-[#FFFDD0]/40 bg-gray-200 dark:bg-gray-800 px-3 py-2">
                    <div className="h-3 w-3 rounded-full border-[2px] border-black/40 dark:border-[#FFFDD0]/40 bg-gray-400 dark:bg-gray-600" />
                    <span className="text-black/40 dark:text-[#FFFDD0]/40 line-through">10:30 - 11:30</span>
                    <span className="ml-auto text-black/40 dark:text-[#FFFDD0]/40">Bloqueada</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border-[4px] border-[#009EE3] bg-[#009EE3]/10 dark:bg-[#1A1A1D] p-6 space-y-4 shadow-[8px_8px_0_#009EE3] hover:-translate-y-2 transition-transform">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-xl border-[4px] border-[#009EE3] shadow-[4px_4px_0_#009EE3] -rotate-3">
                    <CreditCard className="h-6 w-6 text-[#009EE3]" />
                  </div>
                  <p className="text-xl font-black uppercase text-[#009EE3] leading-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Abonos online</p>
                </div>
                <p className="text-sm font-bold text-black/80 dark:text-[#FFFDD0]/80">Cobra abonos al momento de la reserva, directo desde el Widget.</p>
                <div className="flex items-center justify-center rounded-xl border-[4px] border-[#009EE3] bg-white px-5 py-4 shadow-[4px_4px_0_#009EE3] mt-2">
                  <img src="/logos/mercadopago.svg" alt="Mercado Pago" className="h-14 w-auto" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Link to see all features */}
        <section className="flex justify-center py-16 bg-[#FFFDD0] dark:bg-[#1A1A1D]">
          <Link href="/caracteristicas">
             <button className="bg-transparent text-black dark:text-[#FFFDD0] border-[4px] border-black dark:border-[#FFFDD0] px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFDD0] hover:-translate-y-1 hover:shadow-[8px_8px_0_#000] dark:hover:shadow-[8px_8px_0_#FFFDD0] transition-all rounded-full" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                Ver todas las características
             </button>
          </Link>
        </section>

        {/* TESTIMONIALS */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8 bg-[#FFFDD0] dark:bg-[#1A1A1D]">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-black dark:text-[#FFFDD0]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Negocios reales.<br/>Resultados reales.</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Card 1 - amarillo */}
            <div className="rounded-[2rem] border-[4px] border-black bg-[#FFDB58] dark:bg-[#1A1A1D] dark:border-[#FFFDD0] p-8 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] flex flex-col gap-4 rotate-[-1deg] hover:-translate-y-2 transition-transform">
              <span className="text-6xl font-black text-black/20 dark:text-[#FFFDD0]/20 leading-none select-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>&ldquo;</span>
              <p className="text-lg font-bold text-black dark:text-[#FFFDD0] leading-relaxed -mt-6">Coordinaba todo por WhatsApp y era un caos. Ahora mis clientas reservan solas de noche y yo me entero a la mañana. No volvería atrás.</p>
              <div className="flex items-center gap-4 mt-auto pt-6 border-t-[4px] border-black/10 dark:border-[#FFFDD0]/10">
                <div className="h-12 w-12 rounded-full border-[4px] border-black dark:border-[#FFFDD0] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] bg-[#FF1493] flex items-center justify-center text-xl font-black text-white shrink-0">V</div>
                <div>
                  <p className="text-base font-black text-black dark:text-[#FFFDD0] uppercase" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Valentina R.</p>
                  <p className="text-sm font-bold text-black/60 dark:text-[#FFFDD0]/60 uppercase">Estética, Stgo</p>
                </div>
              </div>
            </div>
            {/* Card 2 - verde (vamos a usar verde lima de los 70s o el naranja) */}
            <div className="rounded-[2rem] border-[4px] border-black bg-[#FF4500] dark:bg-[#1A1A1D] dark:border-[#FFFDD0] p-8 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] flex flex-col gap-4 md:-translate-y-4 hover:-translate-y-6 transition-transform">
              <span className="text-6xl font-black text-black/20 dark:text-[#FFFDD0]/20 leading-none select-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>&ldquo;</span>
              <p className="text-lg font-bold text-white dark:text-[#FFFDD0] leading-relaxed -mt-6">4 profesionales con horarios distintos y nunca hay cruces. Los recordatorios bajaron mucho las inasistencias. Ya no tocamos el teléfono.</p>
              <div className="flex items-center gap-4 mt-auto pt-6 border-t-[4px] border-black/20 dark:border-[#FFFDD0]/10">
                <div className="h-12 w-12 rounded-full border-[4px] border-black dark:border-[#FFFDD0] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] bg-[#FFFDD0] dark:bg-[#FFDB58] flex items-center justify-center text-xl font-black text-black shrink-0">M</div>
                <div>
                  <p className="text-base font-black text-white dark:text-[#FFFDD0] uppercase" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Marcelo T.</p>
                  <p className="text-sm font-bold text-white/80 dark:text-[#FFFDD0]/60 uppercase">Clínica, Viña</p>
                </div>
              </div>
            </div>
            {/* Card 3 - rosado */}
            <div className="rounded-[2rem] border-[4px] border-black bg-[#FF1493] dark:bg-[#1A1A1D] dark:border-[#FFFDD0] p-8 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] flex flex-col gap-4 rotate-[1deg] hover:-translate-y-2 transition-transform">
              <span className="text-6xl font-black text-black/20 dark:text-[#FFFDD0]/20 leading-none select-none" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>&ldquo;</span>
              <p className="text-lg font-bold text-white dark:text-[#FFFDD0] leading-relaxed -mt-6">Los timbres son lo mejor. Los clientes acumulan y vuelven a canjear. Sin pagar publicidad, las visitas repetidas subieron un montón.</p>
              <div className="flex items-center gap-4 mt-auto pt-6 border-t-[4px] border-black/20 dark:border-[#FFFDD0]/10">
                <div className="h-12 w-12 rounded-full border-[4px] border-black dark:border-[#FFFDD0] shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#2A2A2E] bg-[#FFDB58] flex items-center justify-center text-xl font-black text-black shrink-0">C</div>
                <div>
                  <p className="text-base font-black text-white dark:text-[#FFFDD0] uppercase" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>Carolina S.</p>
                  <p className="text-sm font-bold text-white/80 dark:text-[#FFFDD0]/60 uppercase">Barbería</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-32 border-t-[4px] border-black dark:border-[#FFFDD0] overflow-hidden relative" style={{ background: "#FF1493" }}>
          <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-6 text-center z-10">
            <h2 className="text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl uppercase text-white drop-shadow-[8px_8px_0_#000] dark:drop-shadow-[8px_8px_0_#1A1A1D]" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Tu agenda online<br/>lista en minutos
            </h2>
            <p className="text-xl sm:text-2xl font-black text-black bg-[#FFDB58] px-8 py-3 rounded-full border-[4px] border-black dark:border-[#FFFDD0] shadow-[6px_6px_0_#000] dark:shadow-[6px_6px_0_#FFFDD0] rotate-[-1deg]">
              Te acompañamos en la configuración inicial.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <Link href="/register">
                <button className="rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FFFDD0] dark:bg-[#1A1A1D] px-10 py-5 text-xl font-black text-black dark:text-[#FFFDD0] shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_#000] dark:hover:shadow-[4px_4px_0_#FFFDD0] transition-all rotate-2 flex items-center gap-3">
                  Empezar Gratis <ArrowRight className="h-6 w-6" />
                </button>
              </Link>
              <a href="/api/auth/demo">
                <button className="rounded-full border-[4px] border-black dark:border-[#FFFDD0] bg-[#FF4500] px-10 py-5 text-xl font-black text-white shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFFDD0] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_#000] dark:hover:shadow-[4px_4px_0_#FFFDD0] transition-all -rotate-1 flex items-center gap-3">
                  Ver Demo
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <div className="border-t-[4px] border-black dark:border-[#FFFDD0]">
        <Footer />
      </div>
    </div>
  );
}
