import type { AdminSubscriptionReport } from "@/server/services/admin-subscription-report";

export function SubscriptionBillingDetails({ report, activeStaff }: { report: AdminSubscriptionReport; activeStaff?: number }) {
  return (
    <div className="space-y-2 border-2 border-black bg-white p-3 text-xs font-bold text-black" data-testid="subscription-billing-details">
      <p className="font-black">{report.methodLabel}</p>
      <p className="text-base font-black">{report.baseAmountLabel} · {report.cycleLabel}</p>
      {report.hasCustomPrice && <p>Precio acordado, IVA incluido</p>}
      <p>{activeStaff !== undefined ? `${activeStaff} / ${report.staffLimit} profesionales activos` : `Máximo ${report.staffLimit} profesionales activos`}{report.hasCustomStaffLimit ? " · límite personalizado" : ""}</p>
      {report.isManual && <p>Renovación por transferencia. Sin cobro automático.</p>}
      {report.manualExpired && <p className="text-red-700">Período pagado vencido. Falta registrar una nueva transferencia.</p>}
    </div>
  );
}
