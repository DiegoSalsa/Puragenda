export function VerifiedBookingBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5B21B6] dark:text-[#C4B5FD]">
      <span aria-hidden="true">✓</span>
      {compact ? "Reserva verificada" : "Reserva verificada con Puragenda"}
    </span>
  );
}
