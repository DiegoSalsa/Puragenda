import { cn } from "@/lib/utils";

export type CatalogService = {
  name: string;
  duration: string;
  price: string;
  professional: string;
  note?: string;
  selected?: boolean;
};

export function ServiceCatalogPreview({
  services,
  hint,
}: {
  services: CatalogService[];
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Catálogo</p>
      <ul className="mt-3 space-y-2">
        {services.map((service) => (
          <li
            key={service.name}
            className={cn(
              "rounded-2xl border-2 border-black px-3 py-3 text-black",
              service.selected ? "bg-[#F3E8FF]" : "bg-white",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black leading-tight">{service.name}</p>
                <p className="mt-1 text-xs font-semibold text-black/60">
                  {service.duration} · {service.professional}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black">{service.price}</p>
            </div>
            {service.note ? <p className="mt-2 text-xs font-medium leading-5 text-black/70">{service.note}</p> : null}
          </li>
        ))}
      </ul>
      {hint ? <p className="mt-3 text-xs font-medium leading-5 text-black/55 dark:text-white/55">{hint}</p> : null}
    </div>
  );
}
