// Free text is reduced to a closed vocabulary before reaching the model.
// Customer names, clinical details and other incidental personal text never need
// to leave the request to select one of these aggregate capabilities.
export function growthInputPolicy(message: string, recommendationId?: string) {
  const prepare =
    /\b(prepar[aáé]|prep[aá]rame|preparar|prepare|draft)\b/i.test(message) &&
    !/\b(no|not|never)\b.{0,30}\b(prepar|draft)/i.test(message);
  const unsupported =
    /\b(envi[aá]|env[ií]a|send|aprobar|aprueba|approve|descuento|discount)\b/i.test(
      message,
    );
  const metrics = [
    [/ocupaci|disponib|occupancy|capacity/i, "OCCUPANCY"],
    [/inactiv|recuper|inactive|recover/i, "INACTIVE_COHORT"],
    [/servici|service/i, "SERVICE_PERFORMANCE"],
    [/reten|recurrent|nuevos|retention/i, "RETENTION"],
    [/ingres|cobrad|revenue|collected/i, "RECORDED_REVENUE"],
    [/tendencia|demanda|reservas|trend|demand/i, "BOOKING_TRENDS"],
    [/campañ|contact\s*flow|entregas/i, "CONTACT_CAMPAIGNS"],
    [/cuotas/i, "CONTACT_QUOTAS"],
    [/atribuci|resultados/i, "CONTACT_RESULTS"],
  ] as const;
  const selectedMetrics = metrics
    .filter(([pattern]) => pattern.test(message))
    .map(([, name]) => name);
  return {
    metrics: selectedMetrics,
    allowPrepare: prepare && !unsupported && !recommendationId,
    modelMessage: JSON.stringify({
      intent: recommendationId
        ? "EXPLAIN_RECOMMENDATION"
        : unsupported
          ? "EXPLAIN_UNSUPPORTED_ACTION"
          : prepare
            ? "PREPARE_REVIEWABLE_PROPOSAL"
            : "EXPLAIN_GROWTH_EVIDENCE",
      metrics: selectedMetrics,
      recommendationId: recommendationId ?? null,
      instructions:
        "Consulta evidencia agregada verificada. No ejecutes ni apruebes acciones. Explica el período real y las limitaciones.",
    }),
  };
}
