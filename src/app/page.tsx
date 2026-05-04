import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Code2,
  Headset,
  LayoutTemplate,
  Palette,
  Rocket,
  Scissors,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { WordCarousel } from "@/components/landing/word-carousel";
// Dynamic imports for below-the-fold components (better TTI)
const PricingCards = dynamic(() => import("@/components/pricing-cards").then((m) => m.PricingCards), { ssr: true });
const FAQSection = dynamic(() => import("@/components/landing/faq-section").then((m) => m.FAQSection), { ssr: true });
const Footer = dynamic(() => import("@/components/landing/footer").then((m) => m.Footer), { ssr: true });

// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════

const bentoFeatures = [
  {
    title: "Widget Marca Blanca",
    description: "Se adapta al estilo de cada negocio. Colores, tipografía y branding personalizables vía URL.",
    icon: Palette,
    className: "md:col-span-2",
  },
  {
    title: "Colisiones Inteligentes",
    description: "El sistema detecta automáticamente solapamientos de horario por profesional.",
    icon: Shield,
    className: "",
  },
  {
    title: "Multi-Staff",
    description: "Cada profesional tiene su propia agenda. Sin conflictos entre citas.",
    icon: Users,
    className: "",
  },
  {
    title: "API Abierta",
    description: "Integra el sistema de reservas en cualquier plataforma con nuestra API REST.",
    icon: Code2,
    className: "md:col-span-2",
  },
];

const features = [
  {
    title: "Reservas automáticas 24/7 sin WhatsApp saturado",
    description: "Tus clientes agendan solos desde tu web a cualquier hora. Menos mensajes manuales, menos llamadas perdidas, más tiempo para atender y hacer crecer tu negocio.",
    icon: CalendarClock,
  },
  {
    title: "Widget de reservas listo para insertar en tu web",
    description: "Integramos la agenda de citas en tu sitio con tu estilo visual. Tu cliente nunca siente que sale de tu marca — todo ocurre en tu dominio.",
    icon: LayoutTemplate,
  },
  {
    title: "Gestión multi-profesional con agendas independientes",
    description: "Cada profesional tiene su propia agenda, horarios y servicios asignados. Sin conflictos, sin solapamientos, con detección automática de colisiones.",
    icon: Users,
  },
  {
    title: "Soporte humano directo — sin bots ni tickets eternos",
    description: "Te acompaña un equipo real que conoce negocios locales. Configuración asistida, soporte por WhatsApp y actualizaciones constantes.",
    icon: Headset,
  },
];

// Plans data is now in the shared PricingCards component

// FAQs moved to FAQSection component

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

export default function HomePage() {
  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Puragenda",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://puragenda.cl",
    description:
      "Sistema de agendamiento online para peluquerías, estética, consultas y servicios. Reservas 24/7, widget marca blanca y multi-profesional.",
    offers: [
      {
        "@type": "Offer",
        name: "Plan Base",
        price: "9990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Plan Pro",
        price: "19990",
        priceCurrency: "CLP",
        priceValidUntil: "2027-12-31",
        availability: "https://schema.org/InStock",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "127",
    },
    creator: {
      "@type": "Organization",
      name: "PuroCode",
      url: "https://purocode.com",
    },
  };

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Puragenda",
    url: "https://puragenda.cl",
    logo: "https://puragenda.cl/icon-512x512.png",
    description: "Plataforma SaaS de agendamiento online para negocios de servicios en Latinoamérica.",
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Spanish"],
    },
  };

  // JSON-LD for FAQ moved to FAQSection
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-foreground selection:bg-[#7C3AED]/30">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />

      {/* ─── Premium Background ─── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
        {/* Subtle dot/grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Top Glow Border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7C3AED]/70 to-transparent shadow-[0_0_15px_#7C3AED]/50" />

        {/* Dynamic Spotlight Aurora (Subtle) */}
        <div className="absolute top-[-5%] md:top-[-10%] left-1/2 w-[200%] h-[40vh] md:h-[50vh] -translate-x-1/2 opacity-20 md:opacity-30 dark:opacity-20 dark:md:opacity-40">
          <div className="absolute top-0 left-1/2 w-[100%] md:w-[80%] h-full -translate-x-1/2 bg-[conic-gradient(from_90deg_at_50%_0%,#A78BFA_0%,transparent_50%,#7C3AED_100%)] blur-[30px] md:blur-[60px] lg:blur-[90px] animate-pulse" style={{ animationDuration: '6s' }} />
        </div>

        {/* Floating Ambient Orbs (Subtle) */}
        <div className="absolute top-[5%] md:top-[10%] -left-20 md:-left-10 h-[20rem] w-[20rem] md:h-[35rem] md:w-[35rem] rounded-full bg-[#7C3AED]/15 md:bg-[#7C3AED]/20 blur-[40px] md:blur-[80px] lg:blur-[110px] dark:bg-[#7C3AED]/15 dark:md:bg-[#7C3AED]/25" />
        <div className="absolute top-[30%] -right-20 md:-right-10 h-[25rem] w-[25rem] md:h-[45rem] md:w-[45rem] rounded-full bg-[#E91E8C]/5 md:bg-[#E91E8C]/10 blur-[40px] md:blur-[100px] lg:blur-[130px] dark:bg-[#E91E8C]/10 dark:md:bg-[#E91E8C]/15" />
        <div className="absolute bottom-[10%] left-[0%] md:left-[10%] h-[20rem] w-[20rem] md:h-[40rem] md:w-[40rem] rounded-full bg-[#3b82f6]/5 md:bg-[#3b82f6]/10 blur-[40px] md:blur-[100px] lg:blur-[130px] dark:bg-[#3b82f6]/10 dark:md:bg-[#3b82f6]/15" />
      </div>

      <Navbar />

      <main className="relative z-10">
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-32 md:pt-40 lg:pt-48">
          <div className="animate-fade-up space-y-6 md:space-y-8 text-center relative">

            <h1 className="mx-auto max-w-5xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl drop-shadow-sm relative z-10">
              <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">Software de Reservas</span> <br />
              <WordCarousel />
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl relative z-10">
              Convierte visitas en reservas confirmadas sin llamadas perdidas.
              Sistema de citas con detección de colisiones, widget marca blanca y panel de gestión completo.
            </p>

            {/* Lead Capture Form / CTA */}
            <div className="mx-auto mt-8 flex max-w-md flex-col justify-center gap-4 sm:flex-row relative z-10">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#7C3AED] px-8 py-3 sm:py-4 text-sm font-semibold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all duration-300 hover:bg-[#6D28D9] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]">
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
                  <span className="relative z-10 flex items-center gap-2">
                    Empezar Gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </Link>
              <Link href="/widget/purocode-demo" className="w-full sm:w-auto">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-card/40 px-8 py-3 sm:py-4 text-sm font-semibold text-foreground backdrop-blur-xl transition-all hover:bg-muted/60 hover:border-border shadow-sm">
                  Ver Demo
                </button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground/60 font-medium">Sin tarjeta de crédito · Configura en 2 minutos · Cancela cuando quieras</p>

            <div className="flex flex-wrap justify-center gap-3 pt-4">
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

          </div>

          {/* ─── Product Showcase ─── */}
          <div id="como-funciona" className="mt-24 space-y-8 relative">
            {/* Massive backdrop glow behind showcase */}
            <div className="absolute left-1/2 top-1/2 -z-10 h-[300px] md:h-[600px] w-[100%] md:w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#7C3AED]/15 to-[#A78BFA]/15 md:from-[#7C3AED]/20 md:to-[#A78BFA]/20 blur-[50px] md:blur-[100px] lg:blur-[140px]" />

            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7C3AED]">
                Poder y Simplicidad
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Todo lo que necesitas, en un solo lugar
              </h2>
            </div>

            {/* Main showcase: Widget + Dashboard side by side */}
            <div className="grid gap-6 lg:grid-cols-5 relative">
              {/* Decorative background border for the whole grid */}
              <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-b from-white/5 to-transparent dark:from-white/5 opacity-50" />

              {/* Widget Preview - col 1-2 */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-border/50 bg-card/40 backdrop-blur-2xl p-6 shadow-2xl shadow-black/5 dark:shadow-[#7C3AED]/10 group transition-all duration-500 hover:border-[#7C3AED]/30 hover:bg-card/60">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
                <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
                  <div className="h-2 w-2 rounded-full bg-[#7C3AED] animate-pulse shadow-[0_0_8px_#7C3AED]" />
                  Vista del cliente
                </div>
                {/* Fake widget mockup */}
                <div className="rounded-2xl border border-border/40 bg-background/80 backdrop-blur-xl p-5 shadow-inner">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Reserva online</p>
                      <p className="text-sm font-bold">Estética Bella</p>
                    </div>
                    <span className="rounded-md bg-[#E91E8C]/15 px-2 py-0.5 text-[10px] font-medium text-[#E91E8C]">Paso a paso</span>
                  </div>
                  {/* Step bar */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="rounded-full bg-[#E91E8C]/20 px-2 py-1 text-center text-[9px] text-[#E91E8C]">Servicio</div>
                    <div className="rounded-full bg-[#E91E8C]/20 px-2 py-1 text-center text-[9px] text-[#E91E8C]">Fecha</div>
                    <div className="rounded-full border border-border px-2 py-1 text-center text-[9px] text-muted-foreground">Datos</div>
                  </div>
                  {/* Service cards */}
                  <div className="space-y-2">
                    <div className="rounded-lg border border-[#E91E8C]/30 bg-[#E91E8C]/5 p-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">Corte de pelo</p>
                          <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                            <span>30 min</span>
                            <span>$15.000</span>
                          </div>
                        </div>
                        <div className="h-4 w-4 rounded-md border-2 border-[#E91E8C] bg-[#E91E8C] flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">✓</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">Manicure Gel</p>
                          <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
                            <span>60 min</span>
                            <span>$25.000</span>
                          </div>
                        </div>
                        <div className="h-4 w-4 rounded-md border border-border" />
                      </div>
                    </div>
                  </div>
                  {/* Date pills */}
                  <div className="grid grid-cols-5 gap-1">
                    {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d, i) => (
                      <div key={d} className={`rounded-lg border px-1 py-1.5 text-center text-[9px] ${i === 1 ? "border-[#E91E8C]/30 bg-[#E91E8C]/10" : "border-border"}`}>
                        <p className="text-muted-foreground">{d}</p>
                        <p className="text-xs font-bold">{14 + i}</p>
                      </div>
                    ))}
                  </div>
                  {/* Time slots */}
                  <div className="grid grid-cols-4 gap-1">
                    {["10:00", "10:30", "11:00", "11:30"].map((t, i) => (
                      <div key={t} className={`rounded-full border px-2 py-1 text-center text-[9px] ${i === 2 ? "border-[#E91E8C]/40 bg-[#E91E8C]/15 text-[#E91E8C] font-semibold" : "border-border text-muted-foreground"}`}>
                        {t}
                      </div>
                    ))}
                  </div>
                  {/* Footer */}
                  <div className="border-t border-border/50 pt-2 text-center text-[8px] text-muted-foreground/60">
                    PurAgenda Powered by PuroCode
                  </div>
                </div>
              </div>

              {/* Dashboard Preview - col 3-5 */}
              <div className="lg:col-span-3 relative overflow-hidden rounded-3xl border border-border/50 bg-card/40 backdrop-blur-2xl p-6 shadow-2xl shadow-black/5 dark:shadow-[#7C3AED]/10 group transition-all duration-500 hover:border-[#7C3AED]/30 hover:bg-card/60">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
                <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-6">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
                  Panel de administración · Vista del dueño
                </div>
                {/* Fake dashboard */}
                <div className="rounded-2xl border border-border/40 bg-background/80 backdrop-blur-xl overflow-hidden shadow-inner">
                  {/* Top bar */}
                  <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7C3AED]">
                      <CalendarClock className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs font-bold">Pura<span className="text-[#7C3AED]">genda</span></span>
                    <div className="ml-auto flex gap-1.5">
                      {["Citas", "Staff", "Servicios"].map((t) => (
                        <span key={t} className={`rounded-md px-2 py-0.5 text-[9px] ${t === "Citas" ? "bg-[#7C3AED]/10 text-[#7C3AED]" : "text-muted-foreground"}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {[
                      { label: "Hoy", value: "8", sub: "citas" },
                      { label: "Semana", value: "34", sub: "reservas" },
                      { label: "Check-in", value: "92%", sub: "asistencia" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <p className="text-[9px] text-muted-foreground">{stat.label}</p>
                        <p className="text-lg font-bold leading-tight">{stat.value}</p>
                        <p className="text-[9px] text-muted-foreground/60">{stat.sub}</p>
                      </div>
                    ))}
                  </div>
                  {/* Calendar/Appointments list */}
                  <div className="px-3 pb-3 space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Próximas citas</p>
                    {[
                      { name: "Juan Pérez", service: "Consultoría Web", time: "10:00", staff: "Diego S.", status: "confirmed" },
                      { name: "María González", service: "Desarrollo Landing", time: "11:00", staff: "Diego S.", status: "pending" },
                      { name: "Ana Torres", service: "Consultoría Web", time: "15:00", staff: "Camila R.", status: "checked" },
                    ].map((apt) => (
                      <div key={apt.name} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED]/10 text-[9px] font-bold text-[#7C3AED]">
                            {apt.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[10px] font-medium">{apt.name}</p>
                            <p className="text-[9px] text-muted-foreground">{apt.service} · {apt.staff}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground">{apt.time}</span>
                          <div className={`h-1.5 w-1.5 rounded-full ${apt.status === "confirmed" ? "bg-green-400" : apt.status === "pending" ? "bg-amber-400" : "bg-blue-400"
                            }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary showcase: 3 feature cards with mini-visuals */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Appearance */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3 group hover:border-[#7C3AED]/20 transition-all">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#7C3AED]" />
                  <p className="text-sm font-medium">Personalización total</p>
                </div>
                <p className="text-xs text-muted-foreground">Cada negocio define sus colores. El widget se adapta a su marca.</p>
                <div className="flex gap-2">
                  {["#7C3AED", "#E91E8C", "#D97706", "#22c55e", "#3b82f6"].map((c) => (
                    <div key={c} className="h-6 w-6 rounded-lg shadow-lg" style={{ background: c, boxShadow: `0 4px 12px ${c}40` }} />
                  ))}
                </div>
              </div>
              {/* Multi-staff */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3 group hover:border-[#7C3AED]/20 transition-all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#7C3AED]" />
                  <p className="text-sm font-medium">Multi-profesional</p>
                </div>
                <p className="text-xs text-muted-foreground">Cada staff tiene su propio horario y agenda independiente.</p>
                <div className="flex -space-x-2">
                  {["D", "C", "M", "V"].map((letter, i) => (
                    <div key={letter} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white" style={{ background: ["#7C3AED", "#E91E8C", "#D97706", "#3b82f6"][i], zIndex: 4 - i }}>
                      {letter}
                    </div>
                  ))}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] text-muted-foreground">+3</div>
                </div>
              </div>
              {/* Collision */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3 group hover:border-[#7C3AED]/20 transition-all">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#7C3AED]" />
                  <p className="text-sm font-medium">Sin solapamientos</p>
                </div>
                <p className="text-xs text-muted-foreground">Detección automática de colisiones. Nunca dos citas en el mismo slot.</p>
                <div className="space-y-1 text-[9px]">
                  <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/5 px-2.5 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-green-400">10:00 - 11:00</span>
                    <span className="ml-auto text-muted-foreground">Confirmada</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    <span className="text-red-400 line-through">10:30 - 11:30</span>
                    <span className="ml-auto text-red-400/60">Bloqueada</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/5 px-2.5 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    <span className="text-green-400">11:00 - 12:00</span>
                    <span className="ml-auto text-muted-foreground">Disponible</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Bento Grid ─── */}
          <div className="stagger-children mt-16 grid gap-4 md:grid-cols-4 relative">
            {bentoFeatures.map((feature) => (
              <article
                key={feature.title}
                className={`group relative overflow-hidden rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl p-6 transition-all duration-500 hover:border-[#7C3AED]/30 hover:bg-card/50 shadow-lg hover:shadow-xl dark:shadow-none dark:hover:shadow-[0_0_20px_rgba(124,58,237,0.1)] ${feature.className}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/80 border border-border/50 shadow-sm text-foreground mb-6 group-hover:scale-110 transition-transform duration-500 group-hover:border-[#7C3AED]/40">
                    <feature.icon className="h-5 w-5 text-[#7C3AED] group-hover:text-[#A78BFA] transition-colors" />
                  </div>
                  <p className="mt-auto text-xl font-bold tracking-tight text-foreground">{feature.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Social Proof ─── */}
        <section className="border-y border-border bg-muted/30">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <div className="grid items-center gap-8 md:grid-cols-3">
              <div className="space-y-2 text-center">
                <p className="text-4xl font-bold tracking-tight text-[#7C3AED]">500+</p>
                <p className="text-sm text-muted-foreground">Negocios confían en Puragenda</p>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-4xl font-bold tracking-tight">12.000+</p>
                <p className="text-sm text-muted-foreground">Citas procesadas al mes</p>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-4xl font-bold tracking-tight">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime garantizado</p>
              </div>
            </div>

            {/* Testimonial */}
            <div className="mx-auto mt-12 max-w-2xl">
              <div className="glass rounded-2xl p-6 text-center">
                <p className="text-sm leading-relaxed text-white/60 italic">
                  &ldquo;Antes perdía reservas fuera de horario. Ahora el sistema toma citas solo y yo me enfoco en atender. En una semana recuperé la inversión.&rdquo;
                </p>
                <p className="mt-3 text-xs font-medium text-white/40">
                  — Cliente real, rubro belleza y estética
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Features / Beneficios ─── */}
        <section id="caracteristicas" className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
              Beneficios para tu negocio
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Funcionalidades que aumentan tus reservas y reducen ausencias
            </h2>
          </div>

          <div className="stagger-children grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-[#7C3AED]/20"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xl font-semibold">{feature.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section id="precios" className="border-y border-border bg-muted/30 py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-12 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
                Precios claros
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Planes para crecer a tu ritmo
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/45">
                Prueba gratis en Plan Base. Sin tarjeta. Cancela cuando quieras.
              </p>
            </div>

            <PricingCards mode="landing" />
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <FAQSection />

        {/* ─── CTA Final ─── */}
        {/* ─── CTA Final ─── */}
        <section className="border-t border-border py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Tu agenda online lista en minutos
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Te acompañamos desde la configuración inicial hasta la publicación en tu sitio.
              Si vendes servicios, este sistema ya viene preparado para convertir mejor.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/pricing">
                <button className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-[#7C3AED]/20 transition-all hover:bg-[#5B21B6]">
                  Empezar Gratis <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/widget/purocode-demo">
                <button className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground">
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
