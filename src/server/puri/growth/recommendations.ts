import { randomUUID } from "node:crypto";
import { Prisma, type PuriGrowthRecommendation } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { commercialHash } from "@/server/services/commercial-internal";
import { revalidateGrowthScope, type GrowthScope } from "./access";
import { lockGrowthScope } from "./analysis";
import {
  strategySchema,
  growthRulesSchema,
  type GrowthStrategy,
} from "./contracts";
import { collectGrowthEvidence, type GrowthEvidence } from "./evidence";
import { reserveGrowthUsage, settleGrowthUsage } from "./budgets";

export function recommendationHash(
  r: Pick<
    PuriGrowthRecommendation,
    | "businessId"
    | "scopeKey"
    | "signalId"
    | "version"
    | "title"
    | "explanation"
    | "evidenceHash"
    | "evidence"
    | "strategy"
    | "ruleVersion"
    | "expiresAt"
  >,
) {
  return commercialHash({
    businessId: r.businessId,
    scopeKey: r.scopeKey,
    signalId: r.signalId,
    version: r.version,
    title: r.title,
    explanation: r.explanation,
    evidenceHash: r.evidenceHash,
    evidence: r.evidence,
    strategy: r.strategy,
    ruleVersion: r.ruleVersion,
    expiresAt: r.expiresAt,
  });
}
export function explainGrowthSignal(
  kind: string,
  evidence: Record<string, unknown>,
) {
  const c = evidence.cohort as
    | { inactive: number; basis: string; thresholdDays: number }
    | undefined;
  const counts = evidence.counts as
    | { current: number; previous: number }
    | undefined;
  const o = evidence.occupancy as
    | { percent: number; availableMinutes: number }
    | undefined;
  const basis =
    c &&
    (
      {
        CONFIGURED_FALLBACK: "umbral configurado por historial insuficiente",
        PERSONAL_CADENCE: "frecuencia histórica de cada cliente",
        BUSINESS_CADENCE: "frecuencia histórica del negocio",
        MIXED_CADENCE:
          "frecuencia histórica con umbral conservador cuando faltan datos",
      } as Record<string, string>
    )[c.basis];
  if (c)
    return `Hay ${c.inactive} clientes sin próxima reserva que superan su umbral de inactividad. El menor umbral de la cohorte es ${c.thresholdDays} días; criterio: ${basis}. Conviene revisar una recuperación gradual. El consentimiento promocional todavía no está verificado.`;
  if (o)
    return `Se utilizó el ${o.percent}% de ${o.availableMinutes} minutos disponibles según los horarios y excepciones almacenados. Revisa días con capacidad libre antes de preparar una estrategia. El horario histórico no está versionado.`;
  if (kind === "DEMAND_DECLINE" && counts)
    return `Se observaron ${counts.current} reservas frente a ${counts.previous} en el período anterior de igual duración. La comparación no establece una causa ni garantiza ingresos futuros. Revisa cancelaciones y estacionalidad antes de actuar.`;
  return "Hay servicios con cambios de demanda que superan el umbral y la muestra mínima configurados. Revisa la evidencia por servicio antes de preparar acciones; no se infiere rentabilidad ni causalidad.";
}
export async function draftGrowthRecommendation(
  scope: GrowthScope,
  signalId: string,
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  return prisma.$transaction(async (tx) => {
    await lockGrowthScope(tx, scope);
    const signal = await tx.puriGrowthSignal.findFirstOrThrow({
      where: {
        id: signalId,
        businessId: scope.businessId,
        scopeKey: scope.scopeKey,
        status: "DETECTED",
        expiresAt: { gt: now },
      },
    });
    const dedupeKey = commercialHash({ signal: signal.id, version: 1 });
    const prior = await tx.puriGrowthRecommendation.findUnique({
      where: { dedupeKey },
    });
    if (prior) return prior;
    const data = {
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
      signalId: signal.id,
      version: 1,
      title: (
        {
          INACTIVE_CLIENTS: "Recuperación gradual",
          LOW_OCCUPANCY: "Revisar capacidad disponible",
          DEMAND_DECLINE: "Revisar descenso de reservas",
          SERVICE_TREND: "Revisar servicios",
        } as Record<string, string>
      )[signal.kind],
      explanation: explainGrowthSignal(
        signal.kind,
        signal.evidence as Record<string, unknown>,
      ),
      evidenceHash: signal.evidenceHash,
      evidence: {
        ...(signal.evidence as Prisma.JsonObject),
        kind: signal.kind,
        signalVersion: 1,
        priority: signal.priority,
        confidence: signal.confidence,
      },
      strategy: null,
      ruleVersion: signal.ruleVersion,
      expiresAt: signal.expiresAt,
    };
    const rec = await tx.puriGrowthRecommendation.create({
      data: {
        ...data,
        evidence: data.evidence as Prisma.InputJsonValue,
        strategy: Prisma.DbNull,
        dedupeKey,
        contentHash: recommendationHash(data),
      },
    });
    await audit(tx, scope, rec.id, "DRAFTED", `draft:${rec.id}`);
    return rec;
  });
}
export function explainGrowthEvidence(
  e: GrowthEvidence,
  metrics: readonly string[],
): string | null {
  const period = `${e.period.days} días completos, desde ${e.period.start.slice(0, 10)} hasta ${e.period.end.slice(0, 10)} (fin excluido), ${e.period.timezone}`;
  const amount = (value: number) => {
    try {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: e.money?.currency ?? "CLP",
      }).format(value);
    } catch {
      return `${value} ${e.money?.currency ?? ""}`;
    }
  };
  if (metrics.includes("RECORDED_REVENUE")) {
    if (!e.money) return "No tienes acceso financiero a este alcance.";
    const m = e.money;
    return `Para citas de ${period}: ${m.collected === null ? `el cobro total es desconocido; hay ${m.unknownCollectionAppointments} citas pagadas o cerradas sin un total histórico. La parte conocida suma ${amount(m.knownCollected)}` : `el cobro registrado suma ${amount(m.collected)}`}. El valor nominal ${m.estimatedNominalAppointments ? `estimado (${m.estimatedNominalAppointments} citas sin precio histórico)` : "reservado"} es ${amount(m.nominal)}; no equivale a cobro. Los registros de la aplicación no certifican liquidación bancaria ni flujo de caja del período.`;
  }
  if (metrics.includes("RETENTION")) {
    if (!e.retention)
      return "No tienes permiso para consultar cohortes de clientes en este alcance.";
    const r = e.retention;
    return `En ${period} se atendieron ${r.currentClients} clientes: ${r.newClients} con su primera visita completada en este alcance y ${r.repeatClients} recurrentes. De ${r.previousClients} clientes del período anterior, ${r.retainedClients} volvieron en el actual. No se infiere atribución a campañas.`;
  }
  if (metrics.includes("OCCUPANCY")) {
    const o = e.occupancy;
    return o.complete && o.percent !== null
      ? `En ${period}, se ocuparon ${o.occupiedMinutes} de ${o.availableMinutes} minutos disponibles (${o.percent}%). Se excluyen descansos y bloqueos; los horarios históricos no están versionados.`
      : "La ocupación no puede determinarse con suficiente certeza en este alcance. Faltan datos de capacidad o hay disponibilidad compartida o externa sin conciliar. No se recomienda una acción de baja ocupación con estos datos.";
  }
  if (metrics.includes("INACTIVE_COHORT"))
    return e.cohort
      ? explainGrowthSignal("INACTIVE_CLIENTS", { cohort: e.cohort })
      : "No tienes permiso para consultar cohortes de clientes en este alcance.";
  if (metrics.includes("SERVICE_PERFORMANCE"))
    return `En ${period}, el resumen acotado de servicios muestra: ${
      e.services
        .slice(0, 5)
        .map(
          (s) =>
            `${s.service}: ${s.current} reservas, frente a ${s.previous} anteriores`,
        )
        .join("; ") || "sin reservas observadas"
    }. Los servicios se identifican con etiquetas anónimas; no se infiere rentabilidad a partir de la demanda.`;
  return null;
}
async function audit(
  tx: Prisma.TransactionClient,
  scope: GrowthScope,
  id: string,
  event: string,
  key: string,
  details?: Prisma.InputJsonObject,
) {
  return tx.puriGrowthAudit.upsert({
    where: { dedupeKey: key },
    update: {},
    create: {
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
      recommendationId: id,
      event,
      actorId: scope.actorId,
      dedupeKey: key,
      details,
    },
  });
}
function requirePrepare(scope: GrowthScope) {
  if (!scope.canPrepare) throw new Error("PREPARE_FORBIDDEN");
}
function assertHash(
  r: PuriGrowthRecommendation,
  hash: string,
  version: number,
) {
  if (
    r.contentHash !== hash ||
    r.version !== version ||
    recommendationHash(r) !== hash
  )
    throw new Error("CONTENT_CHANGED");
}
export async function prepareGrowthStrategy(
  scope: GrowthScope,
  id: string,
  hash: string,
  version: number,
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  requirePrepare(scope);
  return prisma.$transaction(async (tx) => {
    await lockGrowthScope(tx, scope);
    const r = await tx.puriGrowthRecommendation.findFirstOrThrow({
      where: { id, businessId: scope.businessId, scopeKey: scope.scopeKey },
    });
    if (r.expiresAt <= now) throw new Error("RECOMMENDATION_EXPIRED");
    if (r.status !== "DRAFT") {
      if (r.strategy && r.version === version + 1 && r.status === "PROPOSED")
        return r;
      throw new Error("INVALID_RECOMMENDATION_STATE");
    }
    assertHash(r, hash, version);
    const signal = await tx.puriGrowthSignal.findUniqueOrThrow({
        where: { id: r.signalId },
      }),
      e = r.evidence as Record<string, unknown>;
    const run = await tx.puriGrowthRun.findUniqueOrThrow({
      where: { id: signal.runId },
      select: { evidence: true },
    });
    const rules = growthRulesSchema.parse(
      (run.evidence as unknown as GrowthEvidence).rules,
    );
    const cohort = e.cohort as
      | { thresholdDays: number; inactive: number }
      | undefined;
    // These are review ceilings for a proposal, never an approved sending allocation.
    const strategy: GrowthStrategy = strategySchema.parse({
      version: 1,
      objective:
        signal.kind === "INACTIVE_CLIENTS"
          ? "RECOVERY"
          : signal.kind === "LOW_OCCUPANCY"
            ? "FILL_AVAILABLE_TIME"
            : "REVIEW_DEMAND",
      cohort: {
        kind: "RULE_BASED_REQUERY",
        inactiveDays: cohort?.thresholdDays ?? null,
        noFutureBooking: true,
        ruleVersion: r.ruleVersion,
        rules,
        thresholdPolicy: "PERSONAL_MEDIAN_ELSE_BUSINESS_MEDIAN_ELSE_FALLBACK",
        historyDays: 365,
      },
      frequency: "DAILY_GRADUAL",
      durationDays: 14,
      dailyLimit: 5,
      monthlyLimit: 50,
      exclusionRules: [
        "NO_VERIFIED_CONSENT",
        "SUPPRESSED",
        "FUTURE_BOOKING",
        "RECENT_CONTACT",
        "ENTITLEMENT_EXPIRED",
      ],
      consent: "FRESH_VERIFIABLE_PROMOTIONAL_CONSENT_REQUIRED",
      template: "RECOVERY_REVIEW_REQUIRED",
      estimatedAudience: cohort?.inactive ?? 0,
      guaranteedRevenue: null,
      risks: [
        "Consentimiento pendiente de verificación",
        "La cohorte debe recalcularse con las reglas originales",
        "Límites sujetos a aprobación comercial",
      ],
      approvalRequired: true,
      executable: false,
      engine: "CONTACT_FLOW_NOT_IMPLEMENTED",
    });
    const next = { ...r, version: r.version + 1, strategy };
    const result = await tx.puriGrowthRecommendation.update({
      where: { id },
      data: {
        status: "PROPOSED",
        version: next.version,
        strategy,
        contentHash: recommendationHash(next),
      },
    });
    await audit(tx, scope, id, "PREPARED", `prepare:${id}`, {
      version: result.version,
      contentHash: result.contentHash,
    });
    return result;
  });
}
async function verifyFreshEvidence(
  scope: GrowthScope,
  r: PuriGrowthRecommendation,
  now: Date,
) {
  const run = await prisma.puriGrowthRun.findFirstOrThrow({
    where: {
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
      signals: { some: { id: r.signalId } },
    },
  });
  const evidence = run.evidence as unknown as GrowthEvidence;
  const reservation = await reserveGrowthUsage({
    businessId: scope.businessId,
    category: "ANALYSIS_SQL",
    key: `review:${r.id}:${randomUUID()}`,
    inputHash: r.evidenceHash,
    micros: 0,
    now,
  });
  try {
    const current = await collectGrowthEvidence(
      scope,
      growthRulesSchema.parse(evidence.rules),
      now,
    );
    return current.hash === r.evidenceHash;
  } finally {
    await settleGrowthUsage(reservation.reservation.id, { actualMicros: 0 });
  }
}
export async function transitionGrowthRecommendation(
  scope: GrowthScope,
  input: {
    id: string;
    hash: string;
    version: number;
    action: "VIEW" | "REVIEW" | "APPROVE" | "REJECT";
    explicit?: boolean;
  },
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  if (input.action !== "VIEW") requirePrepare(scope);
  const r = await prisma.puriGrowthRecommendation.findFirstOrThrow({
    where: {
      id: input.id,
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
    },
  });
  assertHash(r, input.hash, input.version);
  if (input.action === "APPROVE" && !input.explicit)
    throw new Error("EXPLICIT_APPROVAL_REQUIRED");
  if (r.expiresAt <= now) {
    await prisma.puriGrowthRecommendation.updateMany({
      where: {
        id: r.id,
        businessId: scope.businessId,
        scopeKey: scope.scopeKey,
      },
      data: { status: "EXPIRED" },
    });
    throw new Error("RECOMMENDATION_EXPIRED");
  }
  if (
    (input.action === "REVIEW" || input.action === "APPROVE") &&
    !(await verifyFreshEvidence(scope, r, now))
  ) {
    await prisma.puriGrowthRecommendation.updateMany({
      where: {
        id: r.id,
        contentHash: input.hash,
        status: { in: ["DRAFT", "PROPOSED", "REVIEWED", "APPROVED"] },
      },
      data: { status: "STALE" },
    });
    throw new Error("EVIDENCE_CHANGED");
  }
  return prisma.$transaction(async (tx) => {
    await lockGrowthScope(tx, scope);
    const current = await tx.puriGrowthRecommendation.findFirstOrThrow({
      where: {
        id: r.id,
        businessId: scope.businessId,
        scopeKey: scope.scopeKey,
      },
    });
    assertHash(current, input.hash, input.version);
    if (current.expiresAt <= now) throw new Error("RECOMMENDATION_EXPIRED");
    if (input.action === "VIEW") {
      await audit(tx, scope, r.id, "VIEWED", `view:${r.id}:${scope.actorId}`);
      return current;
    }
    if (input.action === "APPROVE" && current.status === "APPROVED")
      return current;
    if (input.action === "REJECT" && current.status === "REJECTED")
      return current;
    if (input.action === "REVIEW" && current.status === "REVIEWED")
      return current;
    const state =
      input.action === "REVIEW"
        ? "REVIEWED"
        : input.action === "APPROVE"
          ? "APPROVED"
          : "REJECTED";
    const allowed =
      input.action === "APPROVE"
        ? ["REVIEWED"]
        : input.action === "REVIEW"
          ? ["PROPOSED"]
          : ["DRAFT", "PROPOSED", "REVIEWED"];
    if (!allowed.includes(current.status))
      throw new Error("INVALID_RECOMMENDATION_STATE");
    if (input.action !== "REJECT") strategySchema.parse(current.strategy);
    const updated = await tx.puriGrowthRecommendation.update({
      where: { id: r.id },
      data: {
        status: state,
        ...(state === "APPROVED"
          ? {
              approvedById: scope.actorId,
              approvedAt: now,
              approvedContentHash: input.hash,
            }
          : {}),
        ...(state === "REJECTED"
          ? { rejectedById: scope.actorId, rejectedAt: now }
          : {}),
      },
    });
    if (state === "REJECTED")
      await tx.puriGrowthSignal.update({
        where: { id: r.signalId },
        data: {
          status: "SUPPRESSED",
          suppressedUntil: new Date(+now + 7 * 86400000),
        },
      });
    await audit(tx, scope, r.id, state, `${state}:${r.id}`, {
      version: input.version,
      contentHash: input.hash,
      executable: false,
    });
    return updated;
  });
}
export async function listGrowthRecommendations(
  scope: GrowthScope,
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  return prisma.puriGrowthRecommendation.findMany({
    where: { businessId: scope.businessId, scopeKey: scope.scopeKey },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
export async function approvedGrowthHandoff(
  scope: GrowthScope,
  id: string,
  hash: string,
  version: number,
  now = new Date(),
) {
  await revalidateGrowthScope(scope, now);
  requirePrepare(scope);
  const r = await prisma.puriGrowthRecommendation.findFirstOrThrow({
    where: {
      id,
      businessId: scope.businessId,
      scopeKey: scope.scopeKey,
      status: "APPROVED",
    },
  });
  assertHash(r, hash, version);
  if (r.expiresAt <= now) throw new Error("RECOMMENDATION_EXPIRED");
  if (!(await verifyFreshEvidence(scope, r, now))) {
    await prisma.puriGrowthRecommendation.updateMany({
      where: { id: r.id, status: "APPROVED", contentHash: hash },
      data: { status: "STALE" },
    });
    throw new Error("EVIDENCE_CHANGED");
  }
  return {
    businessId: scope.businessId,
    scopeKey: scope.scopeKey,
    locationId: scope.locationId,
    staffId: scope.staffId,
    recommendationId: r.id,
    version: r.version,
    contentHash: r.contentHash,
    evidenceHash: r.evidenceHash,
    ruleVersion: r.ruleVersion,
    strategy: strategySchema.parse(r.strategy),
    expiresAt: r.expiresAt,
    approvedById: r.approvedById,
    approvedAt: r.approvedAt,
    executable: false as const,
    requiredChecks: [
      "EFFECTIVE_ENTITLEMENT",
      "BUSINESS_AUTHORIZATION",
      "FRESH_RECIPIENT_CONSENT",
      "SUPPRESSION",
      "DAILY_MONTHLY_GLOBAL_QUOTAS",
      "BUDGET",
      "PROPOSAL_VERSION_HASH",
      "REAL_ENGINE_CONFIGURATION",
      "LEGAL_POLICY",
      "SUBSCRIPTION_STATE",
      "VERIFIABLE_ATTRIBUTION",
    ],
  };
}
