import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
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
    title: "Reservas 24/7 sin WhatsApp saturado",
    description: "Tus clientes agendan solos desde tu web. Menos mensajes manuales, más tiempo para atender.",
    icon: CalendarClock,
  },
  {
    title: "Widget listo para insertar",
    description: "Integramos la agenda en tu sitio con tu estilo visual. Tu cliente nunca siente que sale de tu marca.",
    icon: LayoutTemplate,
  },
  {
    title: "Soporte directo de agencia",
    description: "No hablas con bots ni tickets eternos. Te acompaña un equipo humano que conoce negocios locales.",
    icon: Headset,
  },
  {
    title: "Flujo pensado para servicios",
    description: "Funciona para peluquerías, estética, consultas y negocios que trabajan por reserva.",
    icon: Rocket,
  },
];

const plans = [
  {
    name: "Individual",
    price: "$14.990",
    subtitle: "/mes",
    description: "Para emprendedores que trabajan solos.",
    cta: "Probar 1 mes gratis",
    highlighted: false,
    badge: "30 días gratis",
    items: [
      "Citas ilimitadas",
      "1 profesional",
      "Widget embebible",
      "Detección de colisiones",
      "Soporte por email",
    ],
  },
  {
    name: "Base",
    price: "$24.990",
    subtitle: "/mes",
    description: "Para equipos que necesitan crecer con multi-staff.",
    cta: "Empezar ahora",
    highlighted: false,
    items: [
      "Todo de Individual",
      "Staff adicional ($3.000 c/u)",
      "Horarios configurables",
      "Panel completo",
      "Marca blanca",
      "Soporte prioritario",
    ],
  },
  {
    name: "Pro",
    price: "$39.990",
    subtitle: "/mes",
    description: "La solución completa para negocios profesionales.",
    cta: "Activar Plan Pro",
    highlighted: true,
    items: [
      "Todo de Base",
      "Staff adicional ($5.000 c/u)",
      "CORS + API Key dedicada",
      "Calendario semanal pro",
      "Pago anual = 10 meses",
      "Soporte dedicado",
    ],
  },
];

const faqs = [
  {
    question: "¿Cómo integro el widget en mi sitio web?",
    answer:
      "Solo necesitas copiar un código iframe desde tu panel de configuración y pegarlo en tu HTML. El widget se adapta automáticamente al ancho de tu página. Puedes personalizar los colores pasando un parámetro en la URL.",
  },
  {
    question: "¿Puedo personalizar los colores del widget?",
    answer:
      "Sí. Puedes pasar ?color=FF69B4 (o cualquier código hex) en la URL del iframe para cambiar el color de acento. También puedes configurar un color por defecto desde el panel.",
  },
  {
    question: "¿Hay límite de citas en el plan Free?",
    answer:
      "El plan Free permite hasta 50 citas por mes y 1 profesional. Para volúmenes mayores o multi-staff, el Plan Pro es ilimitado.",
  },
  {
    question: "¿Cómo funciona la detección de colisiones?",
    answer:
      "Antes de confirmar una cita, el sistema verifica que no exista otra cita que se solape con el mismo horario y profesional. Si detecta un conflicto, rechaza la reserva automáticamente.",
  },
  {
    question: "¿Puedo conectar Stripe para cobrar?",
    answer:
      "La estructura de suscripciones ya está preparada con campos para Stripe. En una próxima actualización solo será necesario activar el webhook para procesar pagos.",
  },
];

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[#7C3AED]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#7C3AED]/5 blur-[120px]" />
      </div>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7C3AED] shadow-lg shadow-[#7C3AED]/25">
              <CalendarClock className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Pura<span className="text-[#7C3AED]">genda</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <button className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:text-white">
                Iniciar sesión
              </button>
            </Link>
            <Link href="/register">
              <button className="flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[#7C3AED]/25 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/35">
                Crear cuenta <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ─── Hero Section ─── */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-20 lg:pt-28">
          <div className="animate-fade-up space-y-8 text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-white/70">
              <Zap className="h-3.5 w-3.5 text-[#7C3AED]" />
              SaaS de agendamiento para negocios locales
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-7xl">
              Tu agenda inteligente,{" "}
              <span className="bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] bg-clip-text text-transparent">
                integrada en tu web
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg">
              Convierte visitas en reservas confirmadas sin llamadas perdidas ni mensajes sueltos. 
              Sistema de citas con detección de colisiones, widget marca blanca y panel de gestión completo.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register">
                <button className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-[#7C3AED]/20 transition-all hover:bg-[#5B21B6] hover:shadow-[#7C3AED]/30 animate-pulse-glow">
                  Empezar Gratis <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/widget/purocode-demo">
                <button className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:text-white">
                  Ver Demo en Vivo
                </button>
              </Link>
            </div>

            {/* Industry chips */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {[
                { icon: Scissors, label: "Peluquerías" },
                { icon: Sparkles, label: "Centros de estética" },
                { icon: Stethoscope, label: "Consultas y salud" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-sm text-white/50"
                >
                  <item.icon className="h-3.5 w-3.5 text-[#7C3AED]" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Bento Grid ─── */}
          <div className="stagger-children mt-16 grid gap-3 md:grid-cols-4">
            {bentoFeatures.map((feature) => (
              <div
                key={feature.title}
                className={`group rounded-2xl border border-white/[0.06] bg-[#111] p-6 transition-all duration-300 hover:border-[#7C3AED]/20 hover:bg-[#111]/80 ${feature.className}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] transition-colors group-hover:bg-[#7C3AED]/15">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/45">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Social Proof ─── */}
        <section className="border-y border-white/[0.06] bg-[#0D0D0D]">
          <div className="mx-auto w-full max-w-6xl px-6 py-16">
            <div className="grid items-center gap-8 md:grid-cols-3">
              <div className="space-y-2 text-center">
                <p className="text-4xl font-bold tracking-tight text-[#7C3AED]">500+</p>
                <p className="text-sm text-white/45">Negocios confían en Puragenda</p>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-4xl font-bold tracking-tight">12.000+</p>
                <p className="text-sm text-white/45">Citas procesadas al mes</p>
              </div>
              <div className="space-y-2 text-center">
                <p className="text-4xl font-bold tracking-tight">99.9%</p>
                <p className="text-sm text-white/45">Uptime garantizado</p>
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

        {/* ─── Features ─── */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
              Características
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Diseñado para vender mientras atiendes
            </h2>
          </div>

          <div className="stagger-children grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/[0.06] bg-[#111] p-6 transition-all duration-300 hover:border-[#7C3AED]/20"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7C3AED]/10 text-[#7C3AED]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section className="border-y border-white/[0.06] bg-[#0D0D0D] py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-12 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
                Precios claros
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Planes para crecer a tu ritmo
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/45">
                Prueba gratis 30 días. Sin tarjeta. Cancela cuando quieras.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-8 transition-all ${
                    plan.highlighted
                      ? "border-[#7C3AED]/30 bg-gradient-to-b from-[#7C3AED]/5 to-transparent shadow-2xl shadow-[#7C3AED]/10"
                      : "border-white/[0.06] bg-[#111]"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-6 rounded-full bg-[#7C3AED] px-3 py-1 text-xs font-semibold text-white">
                      Más popular
                    </div>
                  )}
                  {"badge" in plan && plan.badge && !plan.highlighted && (
                    <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] px-3 py-1 text-xs font-semibold text-white">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-white/45">{plan.description}</p>
                    <p className="text-4xl font-bold tracking-tight">
                      {plan.price}
                      <span className="ml-1 text-sm font-normal text-white/40">
                        {plan.subtitle}
                      </span>
                    </p>
                  </div>

                  <ul className="mt-6 space-y-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-white/60">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#7C3AED]" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register" className="mt-8 block">
                    <button
                      className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                        plan.highlighted
                          ? "bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/25 hover:bg-[#5B21B6]"
                          : "border border-white/10 text-white/80 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="mx-auto w-full max-w-3xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#7C3AED]">
              Preguntas frecuentes
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              Todo lo que necesitas saber
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-white/[0.06] bg-[#111] transition-all open:border-[#7C3AED]/20 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-medium transition-colors hover:text-white/90">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-white/45">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ─── CTA Final ─── */}
        <section className="border-t border-white/[0.06] py-20">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Tu agenda online lista en minutos
            </h2>
            <p className="max-w-xl text-white/45">
              Te acompañamos desde la configuración inicial hasta la publicación en tu sitio. 
              Si vendes servicios, este sistema ya viene preparado para convertir mejor.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register">
                <button className="flex items-center gap-2 rounded-xl bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-[#7C3AED]/20 transition-all hover:bg-[#5B21B6]">
                  Empezar Gratis <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link href="/widget/purocode-demo">
                <button className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:text-white">
                  Ver Demo
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-8 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-white/30">
          <CalendarClock className="h-4 w-4 text-[#7C3AED]" />
          Puragenda by PuroCode · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
