"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    category: "Precios y planes",
    question: "Â¿Puragenda cobra comisiones por cada reserva agendada?",
    answer: "No. Puragenda funciona con tarifa plana. No cobramos comisiones por cita, el 100% de tus ingresos se queda en tu negocio.",
  },
  {
    category: "Precios y planes",
    question: "Â¿Puragenda tiene prueba gratuita?",
    answer: "SÃ­. Ambos planes incluyen 30 dÃ­as de prueba gratuita, sin tarjeta de crÃ©dito. Al finalizar puedes activar tu suscripciÃ³n o tu cuenta quedarÃ¡ inactiva.",
  },
  {
    category: "Precios y planes",
    question: "Â¿CuÃ¡nto cuesta Puragenda?",
    answer: "El Plan Individual cuesta $12.990 CLP/mes y el Plan Equipo $29.990 CLP/mes. Sin comisiones ni costos ocultos. Ambos incluyen citas ilimitadas, widget de reservas y marketing win-back.",
  },
  {
    category: "Precios y planes",
    question: "Â¿CuÃ¡l es la diferencia entre el Plan Individual y el Plan Equipo?",
    answer: "El Plan Individual es para profesionales que trabajan solos. El Plan Equipo permite hasta 5 profesionales con agendas separadas y roles (Admin/Staff), más adicionales desde el sexto profesional por $3.000 CLP/mes cada uno.",
  },
  {
    category: "Precios y planes",
    question: "Â¿Existe descuento por pagar anualmente?",
    answer: "SÃ­. Con el plan anual pagas 10 meses y obtienes 12, un ahorro equivalente a 2 meses gratis. Aplica para ambos planes.",
  },
  {
    category: "Funcionalidades",
    question: "Â¿CÃ³mo funciona la detecciÃ³n de colisiones de horario?",
    answer: "El sistema bloquea automÃ¡ticamente las horas ocupadas en tiempo real en todos los dispositivos, haciendo matemÃ¡ticamente imposible doble reserva para el mismo profesional.",
  },
  {
    category: "Funcionalidades",
    question: "Â¿CÃ³mo funciona el sistema de fidelizaciÃ³n?",
    answer: "Se otorgan 'timbres' digitales automÃ¡ticamente cada vez que una cita pasa a 'Completada'. Al llegar a la meta, el sistema genera un cÃ³digo de descuento Ãºnico y automatizado.",
  },
  {
    category: "Funcionalidades",
    question: "Â¿QuÃ© es el Marketing Win-Back?",
    answer: "Herramienta integrada que envÃ­a campaÃ±as de email para reactivar clientes inactivos. El Plan Individual permite 50 emails por campaÃ±a y el Equipo hasta 100.",
  },
  {
    category: "Funcionalidades",
    question: "Â¿Puragenda tiene un CRM de clientes?",
    answer: "SÃ­. Cada cliente tiene un perfil con historial completo de citas, gasto acumulado, inasistencias y fecha de registro.",
  },
  {
    category: "Funcionalidades",
    question: "Â¿CÃ³mo funciona el programa de referidos?",
    answer: "Cada negocio tiene un cÃ³digo Ãºnico. Cuando alguien se registra con tu cÃ³digo y activa su plan, recibes fichas para girar una ruleta de recompensas con descuentos reales.",
  },
  {
    category: "Funcionalidades",
    question: "Â¿Es posible reservar mÃºltiples servicios en una misma cita?",
    answer: "SÃ­. Puedes configurar el mÃ¡ximo de servicios por reserva. El sistema calcula la duraciÃ³n total automÃ¡ticamente.",
  },
  {
    category: "Funcionalidades",
    question: "Â¿Puedo bloquear horarios especÃ­ficos de un profesional?",
    answer: "SÃ­. Puedes crear bloqueos por dÃ­as u horas (vacaciones, capacitaciones, etc.) y quedan automÃ¡ticamente no disponibles en el widget.",
  },
  {
    category: "Widget y reservas",
    question: "Â¿CuÃ¡l es el mejor software de reservas sin contraseÃ±as para clientes?",
    answer: "Puragenda usa 'Cuentas Invisibles': los clientes se identifican solo con su email, sin contraseÃ±as. Esto aumenta radicalmente la tasa de conversiÃ³n.",
  },
  {
    category: "Widget y reservas",
    question: "Â¿Puedo personalizar los colores y el logo del widget?",
    answer: "SÃ­. Desde 'Apariencia' configuras color primario, secundario, fondo, texto y tamaÃ±o de fuente. TambiÃ©n puedes subir el logo de tu negocio.",
  },
  {
    category: "Widget y reservas",
    question: "Â¿Se puede embeber el widget en mi pÃ¡gina web?",
    answer: "SÃ­. Desde ConfiguraciÃ³n obtienes un cÃ³digo iframe listo para pegar en tu sitio. Se adapta automÃ¡ticamente al ancho del contenedor.",
  },
  {
    category: "Widget y reservas",
    question: "Â¿CÃ³mo confirman o cancelan su cita los clientes?",
    answer: "Puragenda envÃ­a un email con enlaces Ãºnicos para confirmar o cancelar. Al hacer clic, la acciÃ³n se procesa automÃ¡ticamente y el negocio recibe notificaciÃ³n.",
  },
  {
    category: "Widget y reservas",
    question: "Â¿Puragenda funciona como app en el celular?",
    answer: "Es una PWA (Progressive Web App). Se puede instalar desde el navegador como app nativa, con Ã­cono en pantalla de inicio y experiencia a pantalla completa.",
  },
  {
    category: "Soporte",
    question: "Â¿Es Puragenda una buena alternativa a AgendaPro en Chile?",
    answer: "SÃ­. Puragenda es mÃ¡s rÃ¡pida, sin comisiones ocultas y con soporte directo. Ideal para salones, barberÃ­as y clÃ­nicas en Chile.",
  },
  {
    category: "Soporte",
    question: "Â¿DÃ³nde estÃ¡ ubicado el soporte tÃ©cnico?",
    answer: "Somos PuroCode, con base en el Gran ConcepciÃ³n, RegiÃ³n del BiobÃ­o. Soporte tÃ©cnico local, directo y humano.",
  },
  {
    category: "Soporte",
    question: "Â¿Funciona el widget para barberÃ­as y centros de estÃ©tica?",
    answer: "Absolutamente. El widget marca blanca se adapta a la estÃ©tica de cualquier negocio y permite reservas 24/7 de forma automatizada.",
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

