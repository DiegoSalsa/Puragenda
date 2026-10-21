import { quoteCommercialPlan, COMMERCIAL_CATALOG_VERSION } from "@/core/commercial-catalog";
import { calculatePrice } from "@/server/services/subscription.service";
import { commercialQuote } from "@/websites/commercial";

const professionalTotals = [1, 2, 3, 4, 5, 6, 7, 8, 25, 100];

function oldEngines(total: number) {
  const representable = total === 1 || total >= 5;
  const oldPlan = total === 1 ? "INDIVIDUAL" : "EQUIPO";
  const extras = oldPlan === "EQUIPO" ? Math.max(0, total - 5) : 0;
  const service = calculatePrice(oldPlan, "MONTHLY", extras);
  const publicQuote = commercialQuote(oldPlan, "monthly", extras);
  return {
    representable,
    plan: oldPlan,
    extras,
    serviceTotal: representable ? service.total : null,
    publicTotal: representable ? publicQuote.baseMonthly : null,
    publicExtras: publicQuote.extras,
  };
}

const rows = professionalTotals.map((professionalTotal) => {
  const puragenda = quoteCommercialPlan({
    catalogVersion: COMMERCIAL_CATALOG_VERSION,
    plan: "PURAGENDA",
    professionalTotal,
  });
  const plus = quoteCommercialPlan({
    catalogVersion: COMMERCIAL_CATALOG_VERSION,
    plan: "PURAGENDA_PLUS",
    professionalTotal,
  });
  const legacy = oldEngines(professionalTotal);

  return {
    professionalTotal,
    puragenda: puragenda.monthlyTotal,
    puragendaPlus: plus.monthlyTotal,
    legacyService: legacy.serviceTotal,
    legacyPublic: legacy.publicTotal,
    legacyPublicExtras: legacy.publicExtras,
    differenceVsLegacyService:
      legacy.serviceTotal === null ? null : puragenda.monthlyTotal - legacy.serviceTotal,
    differenceVsLegacyPublic:
      legacy.publicTotal === null ? null : puragenda.monthlyTotal - legacy.publicTotal,
    note: legacy.representable
      ? legacy.publicExtras === legacy.extras
        ? "legacy representable"
        : "legacy public engine capped extras at 20"
      : "legacy has no equivalent professional total",
  };
});

console.table(rows);
console.log(JSON.stringify({ catalogVersion: COMMERCIAL_CATALOG_VERSION, rows }, null, 2));
