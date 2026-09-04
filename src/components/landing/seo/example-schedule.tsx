import { cn } from "@/lib/utils";

export type ScheduleSlot = {
  time: string;
  label: string;
  person: string;
  state: "free" | "busy" | "blocked";
};

export function ExampleSchedule({
  title,
  badge,
  slots,
  footer,
}: {
  title: string;
  badge?: string;
  slots: ScheduleSlot[];
  footer?: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black">{title}</p>
        {badge ? (
          <span className="rounded-full border-2 border-black bg-[#BFFCC6] px-2 py-0.5 text-[10px] font-black uppercase text-black">
            {badge}
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {slots.map((slot) => (
          <li
            key={`${slot.person}-${slot.time}-${slot.label}`}
            className={cn(
              "grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border-2 border-black px-3 py-2 text-sm font-bold",
              slot.state === "free" && "bg-[#BFFCC6] text-black",
              slot.state === "busy" && "bg-[#FFF5BA] text-black",
              slot.state === "blocked" && "bg-[#F3F4F6] text-black/70",
            )}
          >
            <span className="font-black tabular-nums">{slot.time}</span>
            <span className="truncate">{slot.label}</span>
            <span className="text-xs font-black uppercase tracking-wide">{slot.person}</span>
          </li>
        ))}
      </ul>
      {footer ? <p className="mt-3 text-xs font-medium text-black/55 dark:text-white/55">{footer}</p> : null}
    </div>
  );
}
