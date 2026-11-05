import { writeFileSync } from "node:fs";
// Source snapshot checked on 2026-10-22, never an account-specific invoice.
const rates = { model: "gpt-6-luna", inputUsdPerMillion: 0.10, cachedInputUsdPerMillion: 0.01, cacheWriteUsdPerMillion: 0.125, outputUsdPerMillion: 0.50,
  verifiedAt: "2026-10-22", source: "https://developers.openai.com/api/docs/models/gpt-6-luna" };
const scenarios = [
  { name: "Bajo", calls: 100, inputPerCall: 8000, outputPerCall: 600, retryFactor: 1.10, sqlAnalyses: 20, campaigns: 2, emails: 100 },
  { name: "Habitual", calls: 600, inputPerCall: 12000, outputPerCall: 900, retryFactor: 1.15, sqlAnalyses: 120, campaigns: 10, emails: 500 },
  { name: "Intensivo", calls: 3000, inputPerCall: 20000, outputPerCall: 1200, retryFactor: 1.25, sqlAnalyses: 600, campaigns: 40, emails: 2000 },
  { name: "Extremo", calls: 20000, inputPerCall: 32000, outputPerCall: 1200, retryFactor: 1.50, sqlAnalyses: 6000, campaigns: 200, emails: 10000 },
];
const { require: tsRequire } = await import("tsx/cjs/api");
const { COMMERCIAL_CATALOG_VERSION, quoteCommercialPlan } = tsRequire("../src/core/commercial-catalog.ts", import.meta.url);
const priceClpVatIncluded = quoteCommercialPlan({ plan: "PURAGENDA_PLUS", catalogVersion: COMMERCIAL_CATALOG_VERSION, professionalTotal: 1 }).cycleTotal, vatRate = 0.19, netRevenueClp = priceClpVatIncluded / (1 + vatRate);
const result = { priceClpVatIncluded, vatRate, netRevenueClp, rates,
  assumptions: "Synthetic usage and FX sensitivity, not measured customer consumption. No cache savings assumed. Calls already include analysis explanations and campaign preparation; SQL itself uses no model tokens.",
  unknownCosts: ["Resend contracted commercial allowance and account separation", "PostgreSQL/Vercel contracted tier and allocation", "Mercado Pago contracted commission", "Paddle account-specific fees, settlement/FX", "website hosting per business", "support and refunds"],
  scenarios: scenarios.map(s => {
    const effectiveCalls = Math.ceil(s.calls * s.retryFactor - 1e-9);
    const inputTokens = effectiveCalls * s.inputPerCall, outputTokens = effectiveCalls * s.outputPerCall;
    const aiUsd = (inputTokens * rates.inputUsdPerMillion + outputTokens * rates.outputUsdPerMillion) / 1e6;
    const aiUsdUpperWithCacheWrites = (inputTokens * rates.cacheWriteUsdPerMillion + outputTokens * rates.outputUsdPerMillion) / 1e6;
    return { ...s, effectiveCalls, inputTokens, outputTokens, aiUsd, aiUsdUpperWithCacheWrites, emailUsd: null, infrastructureUsd: null, providerFeesClp: null, grossMarginPercent: null,
      sensitivity: [850, 950, 1050].map(fxClpPerUsd => ({ assumedFxClpPerUsd: fxClpPerUsd,
        aiClp: aiUsd * fxClpPerUsd, remainderBeforeUnknownCostsClp: netRevenueClp - aiUsd * fxClpPerUsd,
        maximumOtherCostsFor70PercentMarginClp: netRevenueClp * 0.30 - aiUsd * fxClpPerUsd })),
      exceedsSandboxAiBudget2Usd: aiUsd > 2,
    };
  }),
};
const output = process.argv[2];
if (output) writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
