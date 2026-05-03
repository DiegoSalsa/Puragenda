"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "¿Puragenda cobra comisiones por cada reserva agendada?",
    answer:
      "No. A diferencia de otras plataformas, Puragenda funciona con un modelo SaaS (Software as a Service) de tarifa plana. No cobramos comisiones por cita, permitiendo que el 100% de tus ingresos se queden en tu negocio.",
  },
  {
    question: "¿Es Puragenda una buena alternativa a AgendaPro en Chile?",
    answer:
      "Sí, Puragenda destaca como una alternativa moderna y ultra rápida, enfocada en eliminar la fricción del usuario, sin comisiones ocultas y con un soporte directo, ideal para salones, barberías y clínicas.",
  },
  {
    question: "¿Cuál es el mejor software de reservas sin contraseñas para clientes?",
    answer:
      "Puragenda utiliza un sistema de 'Cuentas Invisibles' donde los clientes se identifican únicamente con su email al agendar, eliminando la necesidad de recordar contraseñas y aumentando radicalmente la tasa de conversión.",
  },
  {
    question: "¿Cómo funciona la detección de colisiones de horario en Puragenda?",
    answer:
      "Nuestro sistema inteligente bloquea automáticamente las horas ocupadas en tiempo real en todos los dispositivos, garantizando que sea matemáticamente imposible que dos clientes agenden al mismo profesional en el mismo bloque horario.",
  },
  {
    question: "¿Dónde está ubicado el soporte técnico de Puragenda?",
    answer:
      "Puragenda es un software desarrollado por la agencia PuroCode, con base en el Gran Concepción y Talcahuano, Región del Biobío. Ofrecemos un soporte técnico directo, local y humano, sin depender de call centers internacionales.",
  },
  {
    question: "¿Funciona el widget de Puragenda para barberías y centros de estética?",
    answer:
      "Absolutamente. El widget marca blanca está diseñado específicamente para adaptarse a la estética de peluquerías, barberías y clínicas, permitiendo reservas 24/7 de forma automatizada.",
  },
  {
    question: "¿Cómo funciona el sistema de fidelización de Puragenda?",
    answer:
      "El sistema otorga 'timbres' digitales automáticamente cada vez que una cita pasa a estado 'Completada'. Al llegar a la meta, el sistema genera un código de descuento único y automatizado para asegurar la próxima visita del cliente.",
  },
];

export function FAQSection() {
  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-6 py-24 relative">
      {/* Schema JSON-LD for Generative Engine Optimization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* Subtle glow behind FAQ */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[400px] w-[600px] max-w-[100vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-[#7C3AED]/5 to-[#A78BFA]/5 blur-[100px]" />

      <div className="mb-14 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7C3AED]">
          Preguntas frecuentes
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Todo lo que necesitas saber
        </h2>
      </div>

      <div className="space-y-4">
        <Accordion className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md px-6 py-2 transition-all duration-300 hover:border-[#7C3AED]/30 hover:bg-card/60 hover:shadow-lg hover:shadow-[#7C3AED]/5 data-[state=open]:border-[#7C3AED]/40 data-[state=open]:bg-card/80 data-[state=open]:shadow-xl data-[state=open]:shadow-[#7C3AED]/10"
            >
              <AccordionTrigger className="text-[15px] font-semibold hover:no-underline hover:text-[#A78BFA] transition-colors py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
