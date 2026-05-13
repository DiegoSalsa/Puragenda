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
  {
    question: "¿Puragenda tiene prueba gratuita?",
    answer:
      "Sí. Tanto el Plan Individual como el Plan Equipo incluyen 30 días de prueba gratuita, sin necesidad de ingresar tarjeta de crédito. Al finalizar la prueba, puedes activar tu suscripción o tu cuenta quedará inactiva.",
  },
  {
    question: "¿Cuánto cuesta Puragenda?",
    answer:
      "El Plan Individual tiene un costo de $12.990 CLP/mes y el Plan Equipo $29.990 CLP/mes. No hay comisiones por cita ni costos ocultos. Ambos planes incluyen citas ilimitadas, widget de reservas y marketing win-back.",
  },
  {
    question: "¿Cuál es la diferencia entre el Plan Individual y el Plan Equipo?",
    answer:
      "El Plan Individual está pensado para profesionales que trabajan solos (1 profesional). El Plan Equipo permite hasta 3 profesionales incluidos con agendas separadas y roles diferenciados (Admin/Staff), más la posibilidad de agregar profesionales adicionales por $3.000 CLP/mes cada uno.",
  },
  {
    question: "¿Puedo personalizar los colores y el logo del widget de reservas?",
    answer:
      "Sí. Desde la sección 'Apariencia' del panel puedes configurar el color primario, secundario, fondo, color de texto y hasta el tamaño de fuente del widget. También puedes subir el logo de tu negocio para que aparezca en el widget.",
  },
  {
    question: "¿Es posible reservar múltiples servicios en una misma cita?",
    answer:
      "Sí. Desde el panel de Servicios puedes configurar el número máximo de servicios por reserva. Los clientes podrán seleccionar varios servicios en una sola reserva y el sistema calculará la duración total automáticamente.",
  },
  {
    question: "¿Cómo pueden los clientes confirmar o cancelar su cita?",
    answer:
      "Puragenda envía un correo electrónico a cada cliente con enlaces únicos para confirmar o cancelar su cita. Al hacer clic, la acción se procesa automáticamente y el negocio recibe una notificación inmediata del cambio.",
  },
  {
    question: "¿Qué es el Marketing Win-Back de Puragenda?",
    answer:
      "Es una herramienta integrada que permite enviar campañas de email inteligentes para reactivar a clientes que no han agendado recientemente. El Plan Individual permite hasta 50 emails por campaña y el Plan Equipo hasta 100.",
  },
  {
    question: "¿Puragenda tiene un CRM de clientes?",
    answer:
      "Sí. Cada vez que un cliente agenda, su perfil se crea automáticamente en el CRM. Puedes ver el historial completo de citas, el gasto total acumulado, la cantidad de inasistencias (no-shows) y la fecha de registro de cada cliente.",
  },
  {
    question: "¿Cómo funciona el programa de referidos?",
    answer:
      "Cada negocio registrado recibe un código de referido único. Cuando un nuevo negocio se registra usando tu código y activa su suscripción de pago, tú recibes fichas canjeables que puedes usar para girar una ruleta de recompensas con descuentos reales en tu propia suscripción.",
  },
  {
    question: "¿Puedo bloquear horarios específicos de un profesional?",
    answer:
      "Sí. Desde la sección de Profesionales puedes crear 'bloqueos de horario' para días u horas específicas (vacaciones, capacitaciones, etc.). Esos bloques quedan automáticamente no disponibles para los clientes en el widget.",
  },
  {
    question: "¿Se puede embeber el widget directamente en mi página web?",
    answer:
      "Sí. En la sección de Configuración encontrarás un código iframe listo para copiar y pegar en tu sitio web. El widget se adapta automáticamente al ancho del contenedor y puedes personalizarlo con parámetros de color.",
  },
  {
    question: "¿Puragenda funciona como app en mi celular?",
    answer:
      "Puragenda es una Progressive Web App (PWA). Puedes instalarla desde el navegador de tu celular como si fuera una app nativa, con ícono en tu pantalla de inicio y experiencia a pantalla completa, sin necesidad de ir a una tienda de apps.",
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
