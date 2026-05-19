"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    category: "Precios y planes",
    question: "¿Puragenda cobra comisiones por cada reserva agendada?",
    answer: "No. Puragenda funciona con tarifa plana. No cobramos comisiones por cita, el 100% de tus ingresos se queda en tu negocio.",
  },
  {
    category: "Precios y planes",
    question: "¿Puragenda tiene prueba gratuita?",
    answer: "Sí. Ambos planes incluyen 30 días de prueba gratuita, sin tarjeta de crédito. Al finalizar puedes activar tu suscripción o tu cuenta quedará inactiva.",
  },
  {
    category: "Precios y planes",
    question: "¿Cuánto cuesta Puragenda?",
    answer: "El Plan Individual cuesta $12.990 CLP/mes y el Plan Equipo $29.990 CLP/mes. Sin comisiones ni costos ocultos. Ambos incluyen citas ilimitadas, widget de reservas y marketing win-back.",
  },
  {
    category: "Precios y planes",
    question: "¿Cuál es la diferencia entre el Plan Individual y el Plan Equipo?",
    answer: "El Plan Individual es para profesionales que trabajan solos. El Plan Equipo permite hasta 3 profesionales con agendas separadas y roles (Admin/Staff), más adicionales por $3.000 CLP/mes cada uno.",
  },
  {
    category: "Precios y planes",
    question: "¿Existe descuento por pagar anualmente?",
    answer: "Sí. Con el plan anual pagas 10 meses y obtienes 12, un ahorro equivalente a 2 meses gratis. Aplica para ambos planes.",
  },
  {
    category: "Funcionalidades",
    question: "¿Cómo funciona la detección de colisiones de horario?",
    answer: "El sistema bloquea automáticamente las horas ocupadas en tiempo real en todos los dispositivos, haciendo matemáticamente imposible doble reserva para el mismo profesional.",
  },
  {
    category: "Funcionalidades",
    question: "¿Cómo funciona el sistema de fidelización?",
    answer: "Se otorgan 'timbres' digitales automáticamente cada vez que una cita pasa a 'Completada'. Al llegar a la meta, el sistema genera un código de descuento único y automatizado.",
  },
  {
    category: "Funcionalidades",
    question: "¿Qué es el Marketing Win-Back?",
    answer: "Herramienta integrada que envía campañas de email para reactivar clientes inactivos. El Plan Individual permite 50 emails por campaña y el Equipo hasta 100.",
  },
  {
    category: "Funcionalidades",
    question: "¿Puragenda tiene un CRM de clientes?",
    answer: "Sí. Cada cliente tiene un perfil con historial completo de citas, gasto acumulado, inasistencias y fecha de registro.",
  },
  {
    category: "Funcionalidades",
    question: "¿Cómo funciona el programa de referidos?",
    answer: "Cada negocio tiene un código único. Cuando alguien se registra con tu código y activa su plan, recibes fichas para girar una ruleta de recompensas con descuentos reales.",
  },
  {
    category: "Funcionalidades",
    question: "¿Es posible reservar múltiples servicios en una misma cita?",
    answer: "Sí. Puedes configurar el máximo de servicios por reserva. El sistema calcula la duración total automáticamente.",
  },
  {
    category: "Funcionalidades",
    question: "¿Puedo bloquear horarios específicos de un profesional?",
    answer: "Sí. Puedes crear bloqueos por días u horas (vacaciones, capacitaciones, etc.) y quedan automáticamente no disponibles en el widget.",
  },
  {
    category: "Widget y reservas",
    question: "¿Cuál es el mejor software de reservas sin contraseñas para clientes?",
    answer: "Puragenda usa 'Cuentas Invisibles': los clientes se identifican solo con su email, sin contraseñas. Esto aumenta radicalmente la tasa de conversión.",
  },
  {
    category: "Widget y reservas",
    question: "¿Puedo personalizar los colores y el logo del widget?",
    answer: "Sí. Desde 'Apariencia' configuras color primario, secundario, fondo, texto y tamaño de fuente. También puedes subir el logo de tu negocio.",
  },
  {
    category: "Widget y reservas",
    question: "¿Se puede embeber el widget en mi página web?",
    answer: "Sí. Desde Configuración obtienes un código iframe listo para pegar en tu sitio. Se adapta automáticamente al ancho del contenedor.",
  },
  {
    category: "Widget y reservas",
    question: "¿Cómo confirman o cancelan su cita los clientes?",
    answer: "Puragenda envía un email con enlaces únicos para confirmar o cancelar. Al hacer clic, la acción se procesa automáticamente y el negocio recibe notificación.",
  },
  {
    category: "Widget y reservas",
    question: "¿Puragenda funciona como app en el celular?",
    answer: "Es una PWA (Progressive Web App). Se puede instalar desde el navegador como app nativa, con ícono en pantalla de inicio y experiencia a pantalla completa.",
  },
  {
    category: "Soporte",
    question: "¿Es Puragenda una buena alternativa a AgendaPro en Chile?",
    answer: "Sí. Puragenda es más rápida, sin comisiones ocultas y con soporte directo. Ideal para salones, barberías y clínicas en Chile.",
  },
  {
    category: "Soporte",
    question: "¿Dónde está ubicado el soporte técnico?",
    answer: "Somos PuroCode, con base en el Gran Concepción, Región del Biobío. Soporte técnico local, directo y humano.",
  },
  {
    category: "Soporte",
    question: "¿Funciona el widget para barberías y centros de estética?",
    answer: "Absolutamente. El widget marca blanca se adapta a la estética de cualquier negocio y permite reservas 24/7 de forma automatizada.",
  },
];

const categories = ["Precios y planes", "Funcionalidades", "Widget y reservas", "Soporte"];

type CatStyle = {
  chipActiveBg: string;
  chipActiveText: string;
  chipInactiveBg: string;
  accentBg: string;       // left strip
  openCardBg: string;
  openCardBgDark: string;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  dividerColor: string;
};

const CAT_STYLES: Record<string, CatStyle> = {
  "Precios y planes": {
    chipActiveBg:    "bg-[#FFD600]",
    chipActiveText:  "text-black",
    chipInactiveBg:  "bg-[#FFF5BA] dark:bg-[#FFF5BA]/10",
    accentBg:        "bg-[#FFD600]",
    openCardBg:      "bg-[#FFFDE7]",
    openCardBgDark:  "dark:bg-[#FFD600]/10",
    iconBg:          "bg-[#FFD600]",
    badgeBg:         "bg-[#FFD600]",
    badgeText:       "text-black",
    dividerColor:    "border-[#FFD600]",
  },
  "Funcionalidades": {
    chipActiveBg:    "bg-[#7C3AED]",
    chipActiveText:  "text-white",
    chipInactiveBg:  "bg-[#B28DFF]/30 dark:bg-[#7C3AED]/20",
    accentBg:        "bg-[#7C3AED]",
    openCardBg:      "bg-[#F3EEFF]",
    openCardBgDark:  "dark:bg-[#7C3AED]/15",
    iconBg:          "bg-[#7C3AED]",
    badgeBg:         "bg-[#B28DFF]",
    badgeText:       "text-black",
    dividerColor:    "border-[#7C3AED]",
  },
  "Widget y reservas": {
    chipActiveBg:    "bg-[#0EA5E9]",
    chipActiveText:  "text-white",
    chipInactiveBg:  "bg-[#85E3FF]/40 dark:bg-[#0EA5E9]/20",
    accentBg:        "bg-[#0EA5E9]",
    openCardBg:      "bg-[#EFF9FF]",
    openCardBgDark:  "dark:bg-[#0EA5E9]/10",
    iconBg:          "bg-[#0EA5E9]",
    badgeBg:         "bg-[#85E3FF]",
    badgeText:       "text-black",
    dividerColor:    "border-[#0EA5E9]",
  },
  "Soporte": {
    chipActiveBg:    "bg-[#16A34A]",
    chipActiveText:  "text-white",
    chipInactiveBg:  "bg-[#B9FBC0]/50 dark:bg-[#16A34A]/20",
    accentBg:        "bg-[#22C55E]",
    openCardBg:      "bg-[#F0FFF4]",
    openCardBgDark:  "dark:bg-[#16A34A]/10",
    iconBg:          "bg-[#22C55E]",
    badgeBg:         "bg-[#B9FBC0]",
    badgeText:       "text-black",
    dividerColor:    "border-[#22C55E]",
  },
};

function FAQItem({ faq }: { faq: typeof faqs[0] }) {
  const [open, setOpen] = useState(false);
  const s = CAT_STYLES[faq.category];

  return (
    <div
      className={`rounded-2xl border-4 border-black dark:border-white overflow-hidden transition-all duration-200 ${
        open
          ? `${s.openCardBg} ${s.openCardBgDark} shadow-none translate-x-[3px] translate-y-[3px]`
          : "bg-white dark:bg-black shadow-[5px_5px_0_#000] dark:shadow-[5px_5px_0_#FFFFFF] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] dark:hover:shadow-[6px_6px_0_#FFF]"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-stretch gap-0 text-left group"
      >
        {/* Left accent strip */}
        <div className={`w-2 shrink-0 ${s.accentBg} transition-all duration-200`} />

        <div className="flex-1 flex items-center justify-between gap-3 px-4 py-4">
          <span className="text-[13px] sm:text-[14px] font-black text-black dark:text-white leading-snug">
            {faq.question}
          </span>
          {/* Icon button */}
          <span className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border-2 border-black dark:border-white ${s.iconBg} transition-transform duration-200 ${open ? "rotate-0" : ""}`}>
            {open
              ? <Minus className="h-3.5 w-3.5 text-white dark:text-white" style={{ color: faq.category === "Precios y planes" ? "#000" : undefined }} />
              : <Plus className="h-3.5 w-3.5 text-white" style={{ color: faq.category === "Precios y planes" ? "#000" : undefined }} />
            }
          </span>
        </div>
      </button>

      <div className={`mx-4 mb-4 border-t-2 ${s.dividerColor} pt-3 ${open ? "block" : "hidden"}`}>
        <p className="text-[13px] font-bold text-black/75 dark:text-white/70 leading-relaxed">
          {faq.answer}
        </p>
        <span className={`mt-3 inline-block rounded-full border-2 border-black/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${s.badgeBg} ${s.badgeText}`}>
          {faq.category}
        </span>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const filtered = activeCategory
    ? faqs.filter((f) => f.category === activeCategory)
    : faqs;

  return (
    <section id="faq" className="mx-auto w-full max-w-6xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* Category filter chips */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full border-4 border-black dark:border-white px-5 py-2 text-sm font-black uppercase tracking-wide transition-all duration-150 ${
            activeCategory === null
              ? "bg-black dark:bg-white text-white dark:text-black shadow-none translate-x-[3px] translate-y-[3px]"
              : "bg-white dark:bg-black text-black dark:text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] hover:-translate-y-0.5"
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => {
          const s = CAT_STYLES[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(isActive ? null : cat)}
              className={`rounded-full border-4 border-black dark:border-white px-5 py-2 text-sm font-black uppercase tracking-wide transition-all duration-150 ${
                isActive
                  ? `${s.chipActiveBg} ${s.chipActiveText} shadow-none translate-x-[3px] translate-y-[3px]`
                  : `${s.chipInactiveBg} text-black dark:text-white shadow-[4px_4px_0_#000] dark:shadow-[4px_4px_0_#FFF] hover:-translate-y-0.5`
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* FAQ grid */}
      <div className="columns-1 md:columns-2 gap-4">
        {filtered.map((faq, i) => (
          <div key={`${faq.question}-${i}`} className="break-inside-avoid mb-4">
            <FAQItem faq={faq} />
          </div>
        ))}
      </div>
    </section>
  );
}

