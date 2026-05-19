"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, CalendarClock, Scissors, Sparkles, Stethoscope, Users, Stamp, Mail, Gift, Database, Palette, LayoutTemplate, Shield, CreditCard } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { WordCarousel } from "@/components/landing/word-carousel";
import { Theme70s } from "@/components/landing/Theme70s";
const PricingCards = dynamic(() => import("@/components/pricing-cards").then((m) => m.PricingCards), { ssr: true });
const FAQSection = dynamic(() => import("@/components/landing/faq-section").then((m) => m.FAQSection), { ssr: true });
const Footer = dynamic(() => import("@/components/landing/footer").then((m) => m.Footer), { ssr: true });

const bentoFeatures = [
  { title: "Timbres Digitales", description: "Programa de lealtad integrado. Premia a tus clientes recurrentes con descuentos automaticos.", icon: Stamp, className: "md:col-span-2 bg-[#85E3FF] dark:bg-black border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_#85E3FF] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] dark:hover:shadow-[14px_14px_0px_#85E3FF] dark:text-white", darkIconBg: "dark:bg-[#85E3FF]" },
  { title: "Email Marketing", description: "Campanhas automaticas para reactivar clientes inactivos.", icon: Mail, className: "bg-[#FFB5E8] dark:bg-black border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_#FFB5E8] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] dark:hover:shadow-[14px_14px_0px_#FFB5E8] dark:text-white", darkIconBg: "dark:bg-[#FFB5E8]" },
  { title: "Programa Referidos", description: "Invita a otros negocios y gana meses gratis.", icon: Gift, className: "bg-[#BFFCC6] dark:bg-black border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_#BFFCC6] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] dark:hover:shadow-[14px_14px_0px_#BFFCC6] dark:text-white", darkIconBg: "dark:bg-[#BFFCC6]" },
  { title: "CRM Integrado", description: "Historial de citas, inasistencias y preferencias de cada cliente.", icon: Database, className: "md:col-span-2 bg-[#FFF5BA] dark:bg-black border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_#FFF5BA] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] dark:hover:shadow-[14px_14px_0px_#FFF5BA] dark:text-white", darkIconBg: "dark:bg-[#FFF5BA]" },
  { title: "Widget Marca Blanca", description: "Se adapta al estilo de tu negocio. Colores y branding personalizables.", icon: Palette, className: "md:col-span-2 bg-[#B28DFF] dark:bg-black border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_#B28DFF] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] dark:hover:shadow-[14px_14px_0px_#B28DFF] dark:text-white", darkIconBg: "dark:bg-[#B28DFF]" },
  { title: "Abonos con MercadoPago", description: "Tus clientes pagan sus paquetes y abonos online directo desde el widget. Sin cobrar en mano.", icon: CreditCard, className: "md:col-span-3 bg-[#009EE3]/15 dark:bg-black border-[#009EE3] dark:border-[#009EE3] shadow-[8px_8px_0px_#009EE3] hover:shadow-[14px_14px_0px_#009EE3] dark:text-white", darkIconBg: "dark:bg-[#009EE3]/30", iconColor: "text-[#009EE3]" },
];

const features = [
  { title: "Reservas automaticas 24/7", description: "Tus clientes agendan solos desde tu web a cualquier hora.", icon: CalendarClock, bg: "bg-[#B28DFF]" },
  { title: "Widget listo para tu web", description: "Integramos la agenda en tu sitio con tu estilo visual.", icon: LayoutTemplate, bg: "bg-[#FFF5BA]" },
  { title: "Multi-profesional", description: "Cada profesional tiene su propia agenda y horarios. Sin conflictos.", icon: Users, bg: "bg-[#85E3FF]" },
  { title: "Marketing Win-Back", description: "Recordatorios a clientes que no han vuelto.", icon: Mail, bg: "bg-[#FFB5E8]" },
];

const neoVars: React.CSSProperties & Record<string, string> = {
  "--primary": "#7C3AED",
  "--primary-foreground": "#FFFFFF",
  "--secondary": "#FFF5BA",
  "--secondary-foreground": "#0F172A",
  "--muted": "#FFF5BA",
  "--muted-foreground": "#4A4A4A",
  "--accent": "#7C3AED",
  "--accent-foreground": "#FFFFFF",
  "--ring": "#7C3AED",
};

export function ThemeNeoBrutalism({ user, business }: { user: any; business: any }) {
  const [easterEggCount, setEasterEggCount] = useState(0);
  const [show70s, setShow70s] = useState(false);

  if (show70s) {
    return <Theme70s user={user} business={business} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#FFFAEB] text-black dark:bg-[#111111] dark:text-white font-sans selection:bg-[#B28DFF] dark:selection:text-black transition-colors duration-300" style={neoVars}>
      <Navbar user={user} business={business} />
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative mx-auto flex min-h-[85vh] max-w-6xl flex-col items-center justify-center px-6 pt-32 md:pt-40 lg:pt-48 pb-24 text-center">
          {/* Decorative Elements */}
          <div 
            className="absolute left-10 top-48 md:top-56 hidden lg:block animate-[bounce_5s_infinite] cursor-pointer select-none z-50"
            onClick={() => {
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(400 + (easterEggCount * 40), audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
              } catch (e) {
                // Ignore audio errors
              }

              if (easterEggCount >= 19) {
                setShow70s(true);
              } else {
                setEasterEggCount(prev => prev + 1);
              }
            }}
          >
            <div className="w-16 h-16 bg-[#FFB5E8] border-4 border-black dark:border-white rounded-full shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF5BA]"></div>
          </div>
          <div className="absolute right-12 top-32 hidden lg:block animate-[spin_10s_linear_infinite]">
            <Sparkles className="w-20 h-20 text-[#B28DFF] dark:text-[#85E3FF] drop-shadow-[4px_4px_0_#000] dark:drop-shadow-[4px_4px_0_#FFF]" />
          </div>
          <div className="absolute left-20 bottom-32 hidden lg:block animate-[pulse_4s_infinite]">
            <div className="w-24 h-10 bg-[#BFFCC6] border-4 border-black dark:border-white rounded-full shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] -rotate-12"></div>
          </div>
          <div className="absolute right-24 bottom-40 hidden lg:block animate-[bounce_6s_infinite_reverse]">
            <div className="w-14 h-14 bg-[#FFF5BA] border-4 border-black dark:border-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFB5E8] rotate-45"></div>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center justify-center">
            {/* Differentiator tags */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              <span className="bg-[#BFFCC6] border-[3px] border-black text-black text-sm font-black uppercase px-4 py-1.5 shadow-[3px_3px_0_#000] -rotate-1 tracking-wide">✓ Sin comisiones</span>
              <span className="bg-[#FFF5BA] border-[3px] border-black text-black text-sm font-black uppercase px-4 py-1.5 shadow-[3px_3px_0_#000] rotate-1 tracking-wide">✓ 30 días gratis</span>
              <span className="bg-[#FFB5E8] border-[3px] border-black text-black text-sm font-black uppercase px-4 py-1.5 shadow-[3px_3px_0_#000] -rotate-1 tracking-wide">✓ Sin contrato</span>
            </div>
            <h1 className="sr-only">Tu agenda online inteligente, automática y disponible 24/7</h1>
            <div aria-hidden="true" className="text-6xl font-black uppercase tracking-tighter sm:text-8xl lg:text-9xl">
              <span className="block drop-shadow-[4px_4px_0_rgba(0,0,0,1)] dark:drop-shadow-[4px_4px_0_#FFFFFF]">Tu Agenda</span>
              <span className="block drop-shadow-[4px_4px_0_rgba(0,0,0,1)] dark:drop-shadow-[4px_4px_0_#FFFFFF]">Online</span>
              <span className="mt-4 block inline-block border-[6px] border-black dark:border-white bg-[#85E3FF] dark:bg-[#7C3AED] px-6 py-2 text-[#7C3AED] dark:text-[#85E3FF] shadow-[8px_8px_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_#FFFFFF] transform -rotate-2">
                <WordCarousel words={["PURAGENDA.", "INTELIGENTE.", "AUTOMÁTICO.", "24/7 ONLINE.", "SIN ESTRÉS."]} />
              </span>
            </div>

            {/* CTAs and badges */}
            <div className="mt-12 flex flex-col items-center gap-8 z-20">
              <p className="max-w-2xl text-xl font-bold sm:text-2xl dark:text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.1)]">
                Recibe reservas sin tocar el WhatsApp, cobra abonos online y lleva el control de tu negocio desde un solo lugar.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto justify-center">
                <Link href="/register" className="w-full sm:w-auto">
                  <button className="w-full bg-[#FFB5E8] text-black border-4 border-black dark:border-white px-8 py-5 text-xl font-black uppercase shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-none transition-all flex justify-center items-center gap-3">
                    Empezar Gratis <ArrowRight className="h-6 w-6 stroke-[3px]" />
                  </button>
                </Link>
                <Link href="/widget/purocode-demo" className="w-full sm:w-auto group relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#BFFCC6] border-2 border-black text-black text-xs font-black uppercase px-2 py-0.5 shadow-[2px_2px_0_#000] whitespace-nowrap z-10">
                    <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse inline-block" />
                    En vivo
                  </span>
                  <button className="w-full bg-[#85E3FF] text-black border-4 border-black dark:border-white px-8 py-5 text-xl font-black uppercase shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-[4px] hover:translate-x-[4px] hover:shadow-none transition-all flex justify-center items-center gap-2">
                    ▶ Ver Demo
                  </button>
                </Link>
              </div>

              <p className="text-base font-bold dark:text-gray-300">
                Sin tarjeta de crédito – Configura en 2 minutos – Cancela cuando quieras
              </p>
              
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-[#FFF5BA] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
                  <Scissors className="h-5 w-5" /> Peluquerías
                </div>
                <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-[#85E3FF] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
                  <Sparkles className="h-5 w-5" /> Estética
                </div>
                <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-[#FFB5E8] px-5 py-3 text-sm font-black uppercase text-black shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
                  <Stethoscope className="h-5 w-5" /> Clínicas
                </div>
              </div>


            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE / MOCKUPS */}
        <section id="como-funciona" className="mx-auto w-full max-w-6xl px-6 py-16 space-y-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-6xl text-center">
              Todo lo que necesitas, en un solo lugar
            </h2>
          </div>

          {/* Main showcase: Widget + Dashboard */}
          <div className="grid gap-6 lg:grid-cols-5 relative">
            
            {/* Widget Preview - col 1-2 */}
            <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border-4 border-black dark:border-white bg-[#FFF5BA] dark:bg-black p-6 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFF5BA] transition-transform hover:-translate-y-1">
              <div className="relative flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black dark:text-white mb-6">
                <div className="h-3 w-3 rounded-full border-2 border-black dark:border-white bg-[#FFB5E8] animate-pulse" />
                Vista del cliente
              </div>
              
              {/* Fake widget mockup */}
              <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-[#111111] p-5 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-black/60 dark:text-white/60">Reserva online</p>
                    <p className="text-base font-black">Estética Bella</p>
                  </div>
                  <span className="rounded-full border-2 border-black bg-[#FFB5E8] px-3 py-1 text-[10px] font-black text-black">Paso a paso</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-full border-2 border-black bg-[#FFB5E8] px-2 py-1 text-center text-[10px] font-black text-black shadow-[2px_2px_0_#000]">Servicio</div>
                  <div className="rounded-full border-2 border-black bg-[#FFB5E8] px-2 py-1 text-center text-[10px] font-black text-black shadow-[2px_2px_0_#000]">Fecha</div>
                  <div className="rounded-full border-2 border-black dark:border-white px-2 py-1 text-center text-[10px] font-black dark:text-white">Datos</div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="rounded-xl border-2 border-black bg-[#FFB5E8] p-3 shadow-[2px_2px_0_#000]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black text-black">Corte de pelo</p>
                        <div className="mt-1 flex gap-2 text-[11px] font-bold text-black/80">
                          <span>30 min</span>
                          <span>$15.000</span>
                        </div>
                      </div>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-white text-black font-black text-[10px]">✓</div>
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-black dark:border-white bg-gray-100 dark:bg-gray-800 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black dark:text-white">Manicure Gel</p>
                        <div className="mt-1 flex gap-2 text-[11px] font-bold text-black/60 dark:text-white/60">
                          <span>60 min</span>
                          <span>$25.000</span>
                        </div>
                      </div>
                      <div className="h-5 w-5 rounded-full border-2 border-black dark:border-white bg-white dark:bg-transparent" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d, i) => (
                    <div key={d} className={`rounded-lg border-2 border-black dark:border-white px-1 py-1.5 text-center text-[10px] ${i === 1 ? "bg-[#FFB5E8] shadow-[2px_2px_0_#000] text-black" : "dark:text-white"}`}>
                      <p className={`font-bold ${i === 1 ? "text-black" : "text-black/60 dark:text-white/60"}`}>{d}</p>
                      <p className="text-sm font-black">{14 + i}</p>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-4 gap-1.5 mb-4">
                  {["10:00", "10:30", "11:00", "11:30"].map((t, i) => (
                    <div key={t} className={`rounded-full border-2 px-2 py-1 text-center text-[10px] font-black ${i === 2 ? "border-black bg-[#FFB5E8] text-black shadow-[2px_2px_0_#000]" : "border-black dark:border-white text-black/60 dark:text-white/60"}`}>
                      {t}
                    </div>
                  ))}
                </div>
                
                <div className="border-t-2 border-black/10 dark:border-white/20 pt-3 text-center text-[9px] font-bold text-black/50 dark:text-white/50">
                  PurAgenda Powered by PuroCode
                </div>
              </div>
            </div>

            {/* Dashboard Preview - col 3-5 */}
            <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border-4 border-black dark:border-white bg-[#B28DFF] dark:bg-black p-6 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#B28DFF] transition-transform hover:-translate-y-1">
              <div className="relative flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black dark:text-white mb-6">
                <div className="h-3 w-3 rounded-full border-2 border-black dark:border-white bg-[#85E3FF] animate-pulse" />
                Panel de administración · Vista del dueño
              </div>
              
              {/* Fake dashboard */}
              <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-[#111111] overflow-hidden shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF]">
                {/* Top bar */}
                <div className="flex items-center gap-3 border-b-4 border-black dark:border-white px-4 py-3 bg-[#FFFAEB] dark:bg-[#222]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-black dark:border-white bg-[#7C3AED]">
                    <CalendarClock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-black">
                    Puragenda
                  </span>
                  <div className="ml-auto flex gap-2">
                    {["Citas", "Staff", "Servicios"].map((t) => (
                      <span key={t} className={`rounded-md border-2 border-black dark:border-white px-2 py-1 text-[10px] font-black ${t === "Citas" ? "bg-[#FFF5BA] text-black shadow-[2px_2px_0_#000]" : "dark:text-white"}`}>{t}</span>
                    ))}
                  </div>
                </div>
                
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "Hoy", value: "8", sub: "citas", bg: "bg-[#85E3FF]" },
                    { label: "Semana", value: "34", sub: "reservas", bg: "bg-[#FFF5BA]" },
                    { label: "Check-in", value: "92%", sub: "asistencia", bg: "bg-[#FFB5E8]" },
                  ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl border-2 border-black dark:border-white px-3 py-2 ${stat.bg} shadow-[2px_2px_0_#000]`}>
                      <p className="text-[10px] font-black text-black/70">{stat.label}</p>
                      <p className="text-2xl font-black text-black leading-tight">{stat.value}</p>
                      <p className="text-[10px] font-bold text-black/60">{stat.sub}</p>
                    </div>
                  ))}
                </div>
                
                {/* Calendar/Appointments list */}
                <div className="px-4 pb-4 space-y-2">
                  <p className="text-[11px] font-black uppercase text-black/50 dark:text-white/50 mb-2">Próximas citas</p>
                  {[
                    { name: "Juan Pérez", service: "Consultoría Web", time: "10:00", staff: "Diego S.", status: "confirmed" },
                    { name: "María González", service: "Desarrollo Landing", time: "11:00", staff: "Diego S.", status: "pending" },
                    { name: "Ana Torres", service: "Consultoría Web", time: "15:00", staff: "Camila R.", status: "checked" },
                  ].map((apt) => (
                    <div key={apt.name} className="flex items-center justify-between rounded-xl border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#FFF5BA] text-[11px] font-black text-black shadow-[2px_2px_0_#000]">
                          {apt.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[11px] font-black dark:text-white">{apt.name}</p>
                          <p className="text-[10px] font-bold text-black/60 dark:text-white/60">{apt.service} · {apt.staff}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black dark:text-white">{apt.time}</span>
                        <div className={`h-3 w-3 rounded-full border-2 border-black ${apt.status === "confirmed" ? "bg-[#BFFCC6]" : apt.status === "pending" ? "bg-[#FFF5BA]" : "bg-[#85E3FF]"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary showcase: feature cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 dark:text-white" />
                <p className="text-base font-black uppercase dark:text-white">Personalización</p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">Cada negocio define sus colores. El widget se adapta a su marca.</p>
              <div className="flex gap-2">
                {["#7C3AED", "#FFB5E8", "#FFF5BA", "#BFFCC6", "#85E3FF"].map((c) => (
                  <div key={c} className="h-6 w-6 rounded-md border-2 border-black shadow-[2px_2px_0_#000]" style={{ background: c }} />
                ))}
              </div>
            </div>
            
            <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 dark:text-white" />
                <p className="text-base font-black uppercase dark:text-white">Multi-profesional</p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">Cada staff tiene su propio horario y agenda independiente.</p>
              <div className="flex -space-x-2">
                {["D", "C", "M", "V"].map((letter, i) => (
                  <div key={letter} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black text-[10px] font-black text-black shadow-[2px_2px_0_#000]" style={{ background: ["#85E3FF", "#FFB5E8", "#FFF5BA", "#BFFCC6"][i], zIndex: 4 - i }}>
                    {letter}
                  </div>
                ))}
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-white text-[10px] font-black text-black shadow-[2px_2px_0_#000]">+3</div>
              </div>
            </div>
            
            <div className="rounded-2xl border-4 border-black dark:border-white bg-white dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFFFFF] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 dark:text-white" />
                <p className="text-base font-black uppercase dark:text-white">Sin solapamientos</p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">Detección automática de colisiones. Nunca dos citas iguales.</p>
              <div className="space-y-2 text-[10px] font-black">
                <div className="flex items-center gap-2 rounded-lg border-2 border-black bg-[#BFFCC6] px-2.5 py-1.5 shadow-[2px_2px_0_#000]">
                  <div className="h-2 w-2 rounded-full border border-black bg-white" />
                  <span className="text-black">10:00 - 11:00</span>
                  <span className="ml-auto text-black/60">OK</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border-2 border-black bg-gray-200 px-2.5 py-1.5 opacity-60">
                  <div className="h-2 w-2 rounded-full border border-black bg-black" />
                  <span className="text-black line-through">10:30 - 11:30</span>
                  <span className="ml-auto text-black/60">Bloqueada</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border-4 border-[#009EE3] bg-[#009EE3]/10 dark:bg-black p-5 space-y-3 shadow-[4px_4px_0_#009EE3] hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#009EE3]" />
                <p className="text-base font-black uppercase text-[#009EE3]">Abonos online</p>
              </div>
              <p className="text-sm font-bold text-black/70 dark:text-white/70">Cobra abonos al momento de la reserva, directo desde el Widget.</p>
              {/* MercadoPago official logo */}
              <div className="flex items-center justify-center rounded-lg border-2 border-[#009EE3] bg-white px-5 py-3.5 shadow-[2px_2px_0_#009EE3]">
                <img src="/logos/mercadopago.svg" alt="Mercado Pago" className="h-16 w-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* Link to see all features */}
        <section className="flex justify-center pb-16">
          <Link href="/caracteristicas">
             <button className="bg-transparent text-black dark:text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all">
                Ver todas las características
             </button>
          </Link>
        </section>

        {/* TESTIMONIALS */}
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">Negocios reales. Resultados reales.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 - amarillo, rotada levemente */}
            <div className="rounded-2xl border-4 border-black bg-[#FFF5BA] dark:bg-black dark:border-white p-7 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#FFF5BA] flex flex-col gap-4 rotate-[-0.8deg]">
              <span className="text-4xl font-black text-black/20 leading-none select-none">&ldquo;</span>
              <p className="text-base font-bold text-black dark:text-white leading-relaxed -mt-4">Coordinaba todo por WhatsApp y era un caos. Ahora mis clientas reservan solas de noche y yo me entero a la mañana. No volvería atrás.</p>
              <div className="flex items-center gap-3 mt-auto pt-4 border-t-2 border-black/20 dark:border-white/20">
                <div className="h-11 w-11 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] bg-[#FFB5E8] flex items-center justify-center text-lg font-black text-black shrink-0">V</div>
                <div>
                  <p className="text-sm font-black text-black dark:text-white">Valentina R.</p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">Centro de estética, Stgo</p>
                </div>
              </div>
            </div>
            {/* Card 2 - verde, un poco mas grande visualmente */}
            <div className="rounded-2xl border-4 border-black bg-[#BFFCC6] dark:bg-black dark:border-white p-7 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#BFFCC6] flex flex-col gap-4 md:-translate-y-3">
              <span className="text-4xl font-black text-black/20 leading-none select-none">&ldquo;</span>
              <p className="text-base font-bold text-black dark:text-white leading-relaxed -mt-4">4 kinesiólogos con horarios distintos y nunca hay cruces. Los recordatorios solos bajaron mucho las inasistencias. El equipo ya no toca el teléfono para confirmar citas.</p>
              <div className="flex items-center gap-3 mt-auto pt-4 border-t-2 border-black/20 dark:border-white/20">
                <div className="h-11 w-11 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] bg-[#85E3FF] flex items-center justify-center text-lg font-black text-black shrink-0">M</div>
                <div>
                  <p className="text-sm font-black text-black dark:text-white">Marcelo T.</p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">Clínica de kinesiología</p>
                </div>
              </div>
            </div>
            {/* Card 3 - cyan, rotada al otro lado */}
            <div className="rounded-2xl border-4 border-black bg-[#85E3FF] dark:bg-black dark:border-white p-7 shadow-[8px_8px_0_#000] dark:shadow-[8px_8px_0_#85E3FF] flex flex-col gap-4 rotate-[0.8deg]">
              <span className="text-4xl font-black text-black/20 leading-none select-none">&ldquo;</span>
              <p className="text-base font-bold text-black dark:text-white leading-relaxed -mt-4">Los timbres son lo mejor. Los clientes acumulan y vuelven a canjear. Sin pagar publicidad, las visitas repetidas subieron un montón en pocos meses.</p>
              <div className="flex items-center gap-3 mt-auto pt-4 border-t-2 border-black/20 dark:border-white/20">
                <div className="h-11 w-11 rounded-xl border-2 border-black shadow-[2px_2px_0_#000] bg-[#B28DFF] flex items-center justify-center text-lg font-black text-black shrink-0">C</div>
                <div>
                  <p className="text-sm font-black text-black dark:text-white">Carolina S.</p>
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">Peluquería &amp; barbería</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="border-t-4 border-black dark:border-white py-20 bg-[#85E3FF] dark:bg-[#B28DFF] dark:text-black">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-4xl font-black uppercase tracking-tighter sm:text-5xl">Tu agenda online lista en minutos</h2>
            <p className="max-w-xl font-bold text-black/70">Te acompañamos desde la configuración inicial hasta la publicación en tu sitio.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/pricing">
                <button className="bg-black text-white border-4 border-black dark:border-white px-8 py-4 font-black uppercase text-lg shadow-[6px_6px_0px_rgba(0,0,0,0.3)] dark:shadow-[6px_6px_0px_#FFFFFF] hover:translate-y-1 transition-all flex items-center gap-2">
                  Empezar Gratis <ArrowRight className="h-5 w-5" />
                </button>
              </Link>
              <Link href="/widget/purocode-demo">
                <button className="bg-white text-black border-4 border-black px-8 py-4 font-black uppercase text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_#000000] hover:bg-gray-100 transition-colors">
                  Ver Demo
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}