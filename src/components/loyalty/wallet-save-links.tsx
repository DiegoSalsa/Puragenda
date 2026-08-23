import { ArrowUpRight, WalletCards } from "lucide-react";

interface WalletSaveLinksProps {
  clientId: string;
  availability: { google: boolean; apple: boolean };
  className?: string;
}

/**
 * Neutral text links intentionally lead to the official Wallet save flows.
 * Brand-provided badges can replace these once the issuer accounts are live.
 */
export function WalletSaveLinks({ clientId, availability, className = "" }: WalletSaveLinksProps) {
  if (!availability.google && !availability.apple) return null;

  return (
    <div className={`mt-5 rounded-2xl border border-current/10 bg-black/10 p-3.5 ${className}`}>
      <div className="flex items-start gap-2.5">
        <WalletCards className="mt-0.5 h-4 w-4 shrink-0 opacity-75" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-bold">Lleva tu tarjeta siempre contigo</p>
          <p className="mt-0.5 text-[11px] leading-relaxed opacity-60">Guárdala en la billetera de tu teléfono. Se actualizará cuando sumes timbres o recibas premios.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 pl-6 text-xs font-bold">
        {availability.google && (
          <a href={`/api/wallet/google/${clientId}`} className="inline-flex items-center gap-1.5 underline decoration-current/30 underline-offset-4 transition-opacity hover:opacity-70">
            Agregar a la Billetera de Google <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
        {availability.apple && (
          <a href={`/api/wallet/apple/${clientId}`} className="inline-flex items-center gap-1.5 underline decoration-current/30 underline-offset-4 transition-opacity hover:opacity-70">
            Agregar a Apple Wallet <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
