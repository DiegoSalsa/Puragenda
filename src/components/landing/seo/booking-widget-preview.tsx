import { cn } from "@/lib/utils";

export function BookingWidgetPreview({
  business = "Estudio Norte",
  service = "Atención · 45 min",
  professional = "Ana",
  times = [
    { time: "10:00", available: false },
    { time: "10:45", available: true },
    { time: "11:30", available: true },
  ],
}: {
  business?: string;
  service?: string;
  professional?: string;
  times?: { time: string; available: boolean }[];
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Reserva online</p>
          <p className="mt-1 text-lg font-black">{business}</p>
        </div>
        <span className="rounded-full border-2 border-black bg-[#FFB5E8] px-2 py-0.5 text-[10px] font-black uppercase text-black">
          Paso 3 de 4
        </span>
      </div>
      <div className="mt-4 rounded-2xl border-2 border-black bg-[#F3E8FF] px-3 py-3">
        <p className="text-xs font-semibold text-black/55">Servicio</p>
        <p className="font-black">{service}</p>
      </div>
      <div className="mt-3 rounded-2xl border-2 border-black bg-white px-3 py-3">
        <p className="text-xs font-semibold text-black/55">Profesional</p>
        <p className="font-black">{professional}</p>
      </div>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Horario disponible</p>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {times.map((slot) => (
          <li
            key={slot.time}
            className={cn(
              "rounded-xl border-2 border-black px-2 py-2 text-center text-sm font-black",
              slot.available ? "bg-[#BFFCC6] text-black" : "bg-[#F3F4F6] text-black/35 line-through",
            )}
          >
            {slot.time}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl border-2 border-black bg-[#7C3AED] px-3 py-2.5 text-center text-sm font-black text-white">
        Confirmar reserva
      </p>
    </div>
  );
}
