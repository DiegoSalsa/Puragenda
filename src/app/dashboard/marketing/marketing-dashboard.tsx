import Link from "next/link";
import { AlertCircle, ArrowUpRight, Clock, Mail, Users } from "lucide-react";
import { LocalizedText } from "@/components/i18n/localized-text";
import type { MarketingAvailability } from "@/core/entities";

interface MarketingDashboardProps {
  availability: MarketingAvailability;
  history: { id: string; subject: string; audienceSize: number; sentAt: string }[];
}

const messages: Record<MarketingAvailability["state"], { title: string; description: string }> = {
  LEGACY_PAUSED: {
    title: "Envíos comerciales temporalmente pausados",
    description: "Los envíos anteriores están pausados por revisión de seguridad. Tu historial, tus datos y las condiciones históricas de tu contrato se conservan. Los cupos históricos no están disponibles para enviar durante esta pausa. No necesitas comprar Puragenda+ para conservarlos.",
  },
  SUBSCRIPTION_INACTIVE: {
    title: "Contact Flow requiere acceso comercial vigente",
    description: "Tu contrato no tiene acceso comercial vigente. Puedes consultar el historial; recuperar el acceso requiere una prueba vigente o un periodo legítimamente pagado, según tu contrato.",
  },
  CONTACT_FLOW_NOT_INCLUDED: {
    title: "Contact Flow no está incluido en este plan",
    description: "El plan Puragenda no incluye Contact Flow. El formulario de campañas anteriores permanece pausado y tu historial sigue disponible.",
  },
  CONTACT_FLOW_DISABLED: {
    title: "Contact Flow todavía no está habilitado",
    description: "Tu contrato incluye Contact Flow, pero la función está desactivada. No hay envíos disponibles desde esta página. Tu historial se conserva.",
  },
  CONTACT_FLOW_FORBIDDEN: {
    title: "Contact Flow requiere permisos adicionales",
    description: "No tienes los permisos o el acceso a la sucursal necesarios para revisar Contact Flow. Consulta al administrador del negocio. El historial de marketing sigue disponible según tus permisos.",
  },
  CONTACT_FLOW_REVIEW: {
    title: "Revisión de Contact Flow",
    description: "Puedes revisar Contact Flow en el espacio de Puri+. Las campañas requieren consentimiento verificable y autorización; el formulario de campañas anteriores permanece pausado.",
  },
};

export function MarketingDashboard({ availability, history }: MarketingDashboardProps) {
  const message = messages[availability.state];
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <section id="marketing-status" aria-labelledby="marketing-status-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <AlertCircle className="h-5 w-5 text-brand-foreground" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-3">
            <h2 id="marketing-status-title" className="text-lg font-semibold tracking-tight">{message.title}</h2>
            <p className="text-sm text-muted-foreground">{message.description}</p>
            {availability.state === "CONTACT_FLOW_REVIEW" && !availability.contactFlowDeliveryEnabled && (
              <p className="text-sm font-medium">Los envíos comerciales están desactivados. Acceder al espacio de revisión no habilita entregas.</p>
            )}
            <p className="text-xs text-muted-foreground">Los correos de reservas y pagos mantienen su funcionamiento habitual.</p>
            {availability.contactFlowHref && (
              <Link href={availability.contactFlowHref} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                Revisar Contact Flow <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </section>
      <section id="marketing-history" aria-labelledby="marketing-history-title" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/10">
            <Clock className="h-5 w-5 text-brand-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 id="marketing-history-title" className="text-lg font-semibold tracking-tight"><LocalizedText id="XNlCvrrxIS2U" /></h2>
            <p className="text-xs text-muted-foreground">Consulta los registros de campañas anteriores. Este historial no habilita nuevos envíos.</p>
          </div>
        </div>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay campañas en el historial.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"><LocalizedText id="Sc_7-FpoqETz" /></th>
                  <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"><LocalizedText id="jKqRfKGFWUnr" /></th>
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"><LocalizedText id="k7Kp73gsrNZx" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map(campaign => (
                  <tr key={campaign.id}>
                    <td className="py-3 pr-4"><div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="max-w-[140px] truncate font-medium sm:max-w-[300px]">{campaign.subject}</span></div></td>
                    <td className="py-3 pr-4"><span className="inline-flex items-center gap-1 rounded-full bg-[#7C3AED]/10 px-2.5 py-0.5 text-xs font-medium text-brand-foreground"><Users className="h-3 w-3" />{campaign.audienceSize}</span></td>
                    <td className="whitespace-nowrap py-3 text-muted-foreground"><time dateTime={campaign.sentAt}>{new Date(campaign.sentAt).toLocaleDateString("es-CL", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })}</time></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
