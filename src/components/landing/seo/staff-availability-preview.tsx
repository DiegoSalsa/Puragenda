import { cn } from "@/lib/utils";

export type StaffChip = {
  name: string;
  selected?: boolean;
  meta?: string;
};

export function StaffAvailabilityPreview({
  staff,
  times,
}: {
  staff: StaffChip[];
  times: { time: string; available: boolean }[];
}) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Profesional</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {staff.map((person) => (
          <li
            key={person.name}
            className={cn(
              "rounded-full border-2 border-black px-3 py-1 text-xs font-black",
              person.selected ? "bg-[#7C3AED] text-white" : "bg-white text-black",
            )}
          >
            {person.name}
            {person.meta ? <span className="ml-1 font-semibold opacity-70">{person.meta}</span> : null}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] font-black uppercase tracking-[0.14em] text-black/45">Horas</p>
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {times.map((slot) => (
          <li
            key={slot.time}
            className={cn(
              "rounded-xl border-2 border-black px-2 py-2 text-center text-sm font-black",
              slot.available ? "bg-[#BFFCC6] text-black" : "bg-[#F3F4F6] text-black/40 line-through",
            )}
          >
            {slot.time}
          </li>
        ))}
      </ul>
    </div>
  );
}
