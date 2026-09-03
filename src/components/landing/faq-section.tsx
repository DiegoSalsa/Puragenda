"use client";

import { LocalizedText } from "@/components/i18n/localized-text";

import { useState } from "react";
import { Plus, Minus } from "@/components/icons/hover-icons";
import { serializeJsonLd } from "@/lib/seo";
import { faqPageNode } from "@/lib/json-ld";

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
    answer: "El Plan Individual es para profesionales que trabajan solos. El Plan Equipo permite hasta 5 profesionales con agendas separadas y roles (Admin/Staff), más adicionales desde el sexto profesional por $3.000 CLP/mes cada uno.",
  },
  {
    category: "Precios y planes",
    question: "¿Existe descuento por pagar anualmente?",
    answer: "Sí. Con el plan anual pagas 10 meses y obtienes 12, un ahorro equivalente a 2 meses gratis. Aplica para ambos planes.",
  },
  {
    category: "Funcionalidades",
    question: "¿Cómo funciona la detección de colisiones de horario?",
    answer: "El sistema valida la disponibilidad antes de confirmar y evita asignar al mismo profesional dos reservas que se solapen.",
  },
  {
    category: "Funcionalidades",
    question: "¿Cómo funciona el sistema de fidelización?",
    answer: "Se otorgan timbres digitales cuando una cita pasa a Completada. Al llegar a la meta, el sistema genera un código de descuento para el cliente.",
  },
  {
    category: "Funcionalidades",
    question: "¿Qué es el Marketing Win-Back?",
    answer: "Es una herramienta integrada para enviar campañas por email a clientes inactivos. El Plan Individual permite 50 correos por campaña y el Equipo hasta 100.",
  },
  {
    category: "Funcionalidades",
    question: "¿Puragenda tiene un CRM de clientes?",
    answer: "Sí. Cada cliente tiene un perfil con historial de citas, gasto acumulado, inasistencias y fecha de registro.",
  },
  {
    category: "Funcionalidades",
    question: "¿Cómo funciona el programa de referidos?",
    answer: "Cada negocio tiene un código único. Cuando alguien se registra con ese código y activa su plan, el negocio recibe fichas para acceder a recompensas.",
  },
  {
    category: "Funcionalidades",
    question: "¿Es posible reservar múltiples servicios en una misma cita?",
    answer: "Sí. Puedes configurar el máximo de servicios por reserva y el sistema calcula la duración total.",
  },
  {
    category: "Funcionalidades",
    question: "¿Puedo bloquear horarios específicos de un profesional?",
    answer: "Sí. Puedes crear bloqueos por días u horas para vacaciones, capacitaciones u otros períodos no disponibles.",
  },
  {
    category: "Funcionalidades",
    question: "¿Puedo recibir encargos con varios meses de anticipación?",
    answer: "Sí. Al activar Encargos puedes configurar el horizonte de reserva, cupos por período, semanas bloqueadas, fecha estimada de entrega, archivos de referencia y abonos.",
  },
  {
    category: "Funcionalidades",
    question: "¿La opción Encargos aparece para todos los negocios?",
    answer: "No. Se activa desde Configuración para que una barbería u otro negocio de citas no vea herramientas de producción que no necesita.",
  },
  {
    category: "Widget y reservas",
    question: "¿Los clientes deben crear una contraseña para reservar?",
    answer: "No. El cliente se identifica con su correo durante la reserva y no necesita administrar una contraseña para completar el proceso.",
  },
  {
    category: "Widget y reservas",
    question: "¿Puedo personalizar los colores y el logo del widget?",
    answer: "Sí. Desde Apariencia configuras color primario, secundario, fondo, texto y tamaño de fuente. También puedes subir el logo del negocio.",
  },
  {
    category: "Widget y reservas",
    question: "¿Se puede insertar el widget en mi página web?",
    answer: "Sí. Desde Configuración obtienes un código iframe para pegar en tu sitio. También puedes compartir el enlace directo del widget.",
  },
  {
    category: "Widget y reservas",
    question: "¿Cómo confirman o cancelan su cita los clientes?",
    answer: "Puragenda envía un correo con enlaces únicos para gestionar la cita. El negocio puede ver el cambio desde su panel.",
  },
  {
    category: "Widget y reservas",
    question: "¿Puragenda funciona como app en el celular?",
    answer: "Es una aplicación web progresiva (PWA). Se puede instalar desde el navegador con un ícono en la pantalla de inicio.",
  },
  {
    category: "Soporte",
    question: "¿Cómo comparo Puragenda con AgendaPro u otras alternativas?",
    answer: "Compara el flujo móvil, funciones necesarias, precio total, exportación de datos y soporte. Puragenda publica sus planes y ofrece una prueba para validar el sistema con tu operación real.",
  },
  {
    category: "Soporte",
    question: "¿Dónde está ubicado el soporte técnico?",
    answer: "PuroCode, el equipo que desarrolla Puragenda, tiene base en el Gran Concepción, Región del Biobío. La atención es en español.",
  },
  {
    category: "Soporte",
    question: "¿Funciona el widget para barberías y centros de estética?",
    answer: "Sí. El widget permite configurar servicios, profesionales y colores para esos rubros, y recibir reservas desde un enlace o sitio web.",
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
    ...faqPageNode(faqs),
  };

  const filtered = activeCategory
    ? faqs.filter((f) => f.category === activeCategory)
    : faqs;

  return (
    <section id="faq" className="mx-auto w-full max-w-6xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdFaq) }}
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
          <LocalizedText id="r_TRnW7kOyBL" />
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

