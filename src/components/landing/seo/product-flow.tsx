import { cn } from "@/lib/utils";

const defaultSteps = [
  { label: "Servicio", detail: "Catálogo con duración" },
  { label: "Profesional", detail: "Quién atiende" },
  { label: "Disponibilidad", detail: "Horas reales" },
  { label: "Reserva", detail: "El cliente confirma" },
  { label: "Gestión", detail: "El negocio administra" },
] as const;

export function ProductFlow({
  steps = defaultSteps,
  className,
}: {
  steps?: readonly { label: string; detail: string }[];
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "grid gap-2 sm:grid-cols-5",
        className,
      )}
      aria-label="Cómo se conecta el flujo de Puragenda"
    >
      {steps.map((step, index) => (
        <li
          key={step.label}
          className="relative rounded-2xl border-2 border-black bg-white px-3 py-3 text-black dark:border-white dark:bg-[#0c0c0c] dark:text-white"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
            {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-1 text-sm font-black leading-tight">{step.label}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-black/60 dark:text-white/60">{step.detail}</p>
        </li>
      ))}
    </ol>
  );
}
