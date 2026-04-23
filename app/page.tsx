import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  Headset,
  LayoutTemplate,
  Rocket,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card";

const features = [
  {
    title: "Reservas 24/7 sin WhatsApp saturado",
    description:
      "Tus clientes agendan solos desde tu web. Menos mensajes manuales, mas tiempo para atender y vender.",
    icon: CalendarClock,
  },
  {
    title: "Widget marca blanca listo para insertar",
    description:
      "Integramos la agenda en tu sitio con tu estilo visual. Tu cliente nunca siente que sale de tu marca.",
    icon: LayoutTemplate,
  },
  {
    title: "Soporte directo de agencia",
    description:
      "No hablas con bots ni tickets eternos. Te acompana un equipo humano que conoce negocios locales.",
    icon: Headset,
  },
  {
    title: "Flujo pensado para servicios y pedidos",
    description:
      "Funciona para peluquerias, estetica, consultas y negocios que trabajan por reserva de pedidos especiales.",
    icon: Rocket,
  },
];

const plans = [
  {
    name: "Plan Basico",
    price: "$19.990",
    subtitle: "/mes",
    description: "Ideal para empezar a automatizar reservas sin friccion.",
    cta: "Empezar Gratis",
    highlighted: false,
    items: [
      "Agenda de servicios y horarios",
      "Widget embebible en iframe",
      "Confirmacion de reservas desde panel",
      "Soporte por WhatsApp en horario laboral",
    ],
  },
  {
    name: "Plan Pro",
    price: "$49.990",
    subtitle: "/mes",
    description: "Para negocios que buscan una experiencia premium en su web corporativa.",
    cta: "Solicitar Integracion Pro",
    highlighted: true,
    items: [
      "Todo lo del Plan Basico",
      "Integracion completa en tu web corporativa",
      "Personalizacion avanzada de interfaz",
      "Soporte prioritario y acompanamiento tecnico",
    ],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-purple-900/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-950 via-purple-900 to-violet-700 shadow-lg shadow-purple-900/40">
              <CalendarClock className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              AgendaPro
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" className="border-white/30 bg-background/70 hover:bg-muted/70">
                Iniciar sesion
              </Button>
            </Link>
            <Link href="/register">
              <Button className="gap-2 bg-gradient-to-r from-violet-900 to-purple-700 text-white hover:from-violet-800 hover:to-purple-600">
                Crear cuenta <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-14 px-6 pb-16 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-violet-700/30 text-white">SaaS para negocios locales</Badge>
              <Badge variant="outline" className="border-white/35 text-white">
                Marca blanca
              </Badge>
            </div>

            <div className="space-y-5">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Automatiza reservas y pedidos especiales
                <span className="mt-2 block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-purple-300 bg-clip-text text-transparent">
                  directamente desde tu propia web
                </span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Convierte visitas en reservas confirmadas sin llamadas perdidas ni mensajes sueltos.
                Integramos tu agenda en tu pagina corporativa con experiencia 100% marca blanca.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-900 to-purple-700 text-white shadow-xl shadow-purple-950/45 hover:from-violet-800 hover:to-purple-600">
                  Empezar Gratis <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-border/70 bg-background/70">
                  Ya tengo cuenta
                </Button>
              </Link>
              <Link href="/widget/purocode-demo">
                <Button size="lg" variant="outline" className="border-border/70 bg-background/70">
                  Ver Demo
                </Button>
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Scissors, label: "Peluquerias" },
                { icon: Sparkles, label: "Centros de estetica" },
                { icon: Stethoscope, label: "Consultas y servicios" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4 text-white" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-border/60 bg-card/70 shadow-2xl shadow-purple-950/40">
            <CardHeader className="space-y-3">
              <Badge className="w-fit bg-violet-700/25 text-white">Tu proceso, optimizado</Badge>
              <CardTitle className="text-2xl">Menos friccion, mas conversion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                &ldquo;Antes perdia reservas fuera de horario. Ahora el sistema toma citas solo y yo solo me enfoco en atender.&rdquo;
                <p className="mt-2 text-xs text-white/80">Cliente real de rubro belleza</p>
              </div>
              <div className="space-y-3">
                {[
                  "Agenda visible en tiempo real",
                  "Confirmacion de citas en segundos",
                  "Soporte directo para tu equipo",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <CircleCheck className="h-4 w-4 text-violet-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="border-y border-border/60 bg-card/30 py-20">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 flex flex-col gap-3 text-center">
              <Badge variant="outline" className="mx-auto border-white/35 text-white">Caracteristicas clave</Badge>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Diseñado para vender mientras tu negocio atiende
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feature, index) => (
                <Card
                  key={feature.title}
                  className="animate-in fade-in-0 slide-in-from-bottom-4 border-border/60 bg-card/70 duration-500"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <CardContent className="space-y-3 p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-700/30">
                      <feature.icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 py-20">
          <div className="mb-10 text-center">
            <Badge className="mb-3 bg-violet-700/25 text-white">Precios claros</Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planes para crecer a tu ritmo</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Sin permanencia forzada. Empiezas con onboarding guiado y soporte de nuestro equipo.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.highlighted
                    ? "relative border-violet-400/45 bg-gradient-to-b from-violet-800/25 to-purple-900/30 shadow-2xl shadow-purple-950/40"
                    : "border-border/60 bg-card/70"
                }
              >
                <CardHeader className="space-y-3">
                  {plan.highlighted && (
                    <Badge className="w-fit bg-violet-700/35 text-white">Mas elegido por negocios con web corporativa</Badge>
                  )}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <p className="text-4xl font-semibold tracking-tight">
                    {plan.price}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">{plan.subtitle}</span>
                  </p>
                </CardHeader>

                <CardContent className="space-y-5">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={
                      plan.highlighted
                        ? "w-full bg-gradient-to-r from-violet-900 to-purple-700 text-white hover:from-violet-800 hover:to-purple-600"
                        : "w-full"
                    }
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 py-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 text-center">
            <Badge variant="outline" className="border-white/35 text-white">Implementacion guiada</Badge>
            <h2 className="text-3xl font-semibold tracking-tight">Tu agenda online lista en pocos dias</h2>
            <p className="max-w-2xl text-muted-foreground">
              Te acompanamos desde la configuracion inicial hasta la publicacion en tu sitio.
              Si vendes servicios o pedidos especiales, este sistema ya viene preparado para convertir mejor.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-900 to-purple-700 text-white hover:from-violet-800 hover:to-purple-600">
                  Empezar Gratis <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Iniciar sesion</Button>
              </Link>
              <Link href="/widget/purocode-demo">
                <Button size="lg" variant="outline">Ver Demo</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-white" />
          AgendaPro by PuroCode • {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
