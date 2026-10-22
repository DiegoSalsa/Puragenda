import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GROWTH_RULES,
  growthWindow,
  growthRulesSchema,
  strategySchema,
} from "@/server/puri/growth/contracts";
import {
  calculateOccupancy,
  unionRanges,
  type CapacityAgenda,
} from "@/server/puri/growth/occupancy";
import {
  knownModelMicros,
  maximumModelMicros,
} from "@/server/puri/growth/budgets";
import {
  detectGrowthSignals,
  type GrowthEvidence,
} from "@/server/puri/growth/evidence";
import {
  growthToolDefinitions,
  GROWTH_TOOL_POLICY,
} from "@/server/puri/growth/tools";
import { growthSandboxEnabled } from "@/server/puri/growth/access";
import type { GrowthScope } from "@/server/puri/growth/access";
import { growthInputPolicy } from "@/server/puri/growth/input-policy";
import { explainGrowthEvidence } from "@/server/puri/growth/recommendations";

const window = growthWindow(
  "UTC",
  { ...DEFAULT_GROWTH_RULES, periodDays: 7 },
  new Date("2026-10-22T12:00Z"),
);
const date = (s: string) => new Date(s);
const agenda: CapacityAgenda = {
  staffId: "a",
  locationId: "l",
  timezone: "UTC",
  createdAt: date("2020-01-01"),
  hours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  })),
  overrides: [],
};
const capacity = (
  extra: Partial<Parameters<typeof calculateOccupancy>[0]> = {},
) =>
  calculateOccupancy({
    window,
    agendas: [agenda],
    blockedDates: [],
    blocks: [],
    appointments: [],
    ...extra,
  });
describe("Puri+ deterministic rules and closed defaults", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("compares complete equal civil periods and never includes the current partial day", () => {
    expect(window.startKey).toBe("2026-10-15");
    expect(window.endKey).toBe("2026-10-22");
    expect(window.previousStart.toISOString()).toBe("2026-10-08T00:00:00.000Z");
  });
  it("handles Chilean civil-day DST windows without assuming 24-hour days", () => {
    const w = growthWindow(
      "America/Santiago",
      { ...DEFAULT_GROWTH_RULES, periodDays: 7 },
      date("2026-09-10T16:00Z"),
    );
    expect(+w.end - +w.start).toBe(7 * 86400000 - 3600000);
  });
  it.each([0, 8, 365])("rejects unsupported period %s", (periodDays) => {
    expect(growthRulesSchema.safeParse({ periodDays }).success).toBe(false);
  });
  it("rejects extra rule fields and injection payloads", () => {
    expect(growthRulesSchema.safeParse({ businessId: "victim" }).success).toBe(
      false,
    );
  });
  it("subtracts breaks from actual working minutes", () => {
    expect(capacity().availableMinutes).toBe(7 * 420);
    expect(capacity().percent).toBe(0);
    expect(
      capacity().hours.find((h) => h.localHour === 9)?.availableMinutes,
    ).toBe(7 * 60);
    expect(capacity().hours.find((h) => h.localHour === 12)).toBeUndefined();
  });
  it("clips appointments to capacity and unions duplicates and overlaps", () => {
    const appointments = [
      {
        staffId: "a",
        startTime: date("2026-10-16T08:00Z"),
        endTime: date("2026-10-16T10:00Z"),
      },
      {
        staffId: "a",
        startTime: date("2026-10-16T09:30Z"),
        endTime: date("2026-10-16T10:30Z"),
      },
    ];
    expect(
      capacity({ appointments: [...appointments, ...appointments] })
        .occupiedMinutes,
    ).toBe(90);
  });
  it("does not count a shared professional twice", () => {
    expect(
      capacity({ agendas: [agenda, { ...agenda, locationId: "other" }] })
        .availableMinutes,
    ).toBe(7 * 420);
  });
  it("does add separate professionals as separate capacity", () => {
    expect(
      capacity({ agendas: [agenda, { ...agenda, staffId: "b" }] })
        .availableMinutes,
    ).toBe(14 * 420);
  });
  it("honors closed days, overrides and staff breaks", () => {
    const a = {
      ...agenda,
      overrides: [
        { date: "2026-10-16", isOpen: false, startTime: null, endTime: null },
      ],
      staffHours: agenda.hours.map((h) => ({
        ...h,
        startTime: "10:00",
        endTime: "16:00",
        breakStart: "14:00",
        breakEnd: "15:00",
      })),
    };
    expect(
      capacity({ agendas: [a], blockedDates: ["2026-10-17"] }).availableMinutes,
    ).toBe(5 * 240);
  });
  it("subtracts overlapping blocks only once", () => {
    const b = {
      staffId: "a",
      locationId: null,
      startTime: date("2026-10-16T09:00Z"),
      endTime: date("2026-10-16T11:00Z"),
      type: "UNAVAILABLE",
      releaseAt: null,
    };
    expect(capacity({ blocks: [b, b] }).availableMinutes).toBe(7 * 420 - 120);
  });
  it("has unknown occupancy instead of invented opening hours", () => {
    const c = capacity({ agendas: [{ ...agenda, hours: [] }] });
    expect(c.percent).toBeNull();
    expect(c.complete).toBe(false);
  });
  it("keeps no-capacity days separate from zero utilization", () => {
    const c = capacity({
      agendas: [
        {
          ...agenda,
          hours: agenda.hours.map((h) => ({ ...h, isOpen: false })),
        },
      ],
    });
    expect(c.percent).toBeNull();
    expect(c.availableMinutes).toBe(0);
  });
  it("marks external calendar uncertainty as incomplete", () => {
    expect(
      capacity({ warnings: ["EXTERNAL_CALENDAR_NOT_RECONCILED"] }).complete,
    ).toBe(false);
  });
  it("merges ranges without mutating source inputs", () => {
    const r = {
      startTime: date("2026-10-16T09:00Z"),
      endTime: date("2026-10-16T10:00Z"),
    };
    expect(
      unionRanges([r, { ...r, endTime: date("2026-10-16T11:00Z") }]),
    ).toHaveLength(1);
    expect(r.endTime.toISOString()).toContain("10:00");
  });
  it("does not claim demand trends from insufficient samples or services without history", () => {
    const e = {
      rules: DEFAULT_GROWTH_RULES,
      period: {},
      ruleVersion: "test",
      counts: { current: 0, previous: 2, cancelled: 0, future: 0 },
      services: [{ service: "A", current: 10, previous: 0 }],
      occupancy: { complete: false, availableMinutes: 0, percent: null },
    } as unknown as GrowthEvidence;
    expect(detectGrowthSignals(e)).toEqual([]);
  });
  it("keeps unknown token usage and unknown exact model prices unknown", () => {
    vi.stubEnv("PURI_MODEL_PRICES_USD_PER_MILLION", "{}");
    expect(
      knownModelMicros("x", { input_tokens: 10, output_tokens: 10 }),
    ).toBeNull();
    expect(maximumModelMicros("x", 100)).toBeNull();
  });
  it("uses configured fixture prices and actual cached tokens without negative usage", () => {
    vi.stubEnv(
      "PURI_MODEL_PRICES_USD_PER_MILLION",
      JSON.stringify({ fixture: { input: 1, output: 2, cachedInput: 0.5 } }),
    );
    expect(
      knownModelMicros("fixture", {
        input_tokens: 100,
        output_tokens: 10,
        input_tokens_details: { cached_tokens: 20 },
      }),
    ).toBe(110);
    expect(knownModelMicros("fixture", undefined)).toBeNull();
    expect(
      knownModelMicros("fixture", { input_tokens: -1, output_tokens: 1 }),
    ).toBeNull();
  });
  it("only exposes financial, client and prepare tools when their permissions exist", () => {
    const names = growthToolDefinitions({
      canMoney: false,
      canClients: false,
      canPrepare: false,
    } as GrowthScope).map((t) => (t.type === "function" ? t.name : ""));
    expect(names).toEqual(["get_growth_signals", "get_growth_recommendations"]);
    expect(
      Object.values(GROWTH_TOOL_POLICY).every((t) =>
        ["READ", "PREPARE"].includes(t.mode),
      ),
    ).toBe(true);
  });
  it("uses strict function schemas with required fields and no arbitrary tenant arguments", () => {
    for (const t of growthToolDefinitions({
      canMoney: true,
      canClients: true,
      canPrepare: true,
    } as GrowthScope)) {
      if (t.type !== "function") throw new Error("unexpected tool");
      expect(t.strict).toBe(true);
      expect(t.parameters?.additionalProperties).toBe(false);
      expect(t.parameters?.required).toEqual(
        Object.keys(t.parameters?.properties as object),
      );
    }
  });
  it("refuses internal services in production even if local flags are set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PURI_PLUS_INTERNAL_ENABLED", "1");
    expect(growthSandboxEnabled()).toBe(false);
  });
  it("rejects strategies with executable campaigns or missing unique exclusions", () => {
    expect(strategySchema.safeParse({ executable: true }).success).toBe(false);
  });
  it("keeps unknown collections distinct from estimated nominal value in the SQL fallback", () => {
    const e = {
      period: {
        days: 28,
        start: "2026-09-24",
        end: "2026-10-22",
        timezone: "UTC",
      },
      money: {
        collected: null,
        knownCollected: 2000,
        nominal: 10000,
        currency: "CLP",
        estimatedNominalAppointments: 1,
        unknownCollectionAppointments: 1,
      },
    } as GrowthEvidence;
    expect(explainGrowthEvidence(e, ["RECORDED_REVENUE"])).toMatch(
      /cobro total es desconocido/,
    );
    expect(explainGrowthEvidence(e, ["RECORDED_REVENUE"])).toMatch(
      /valor nominal estimado/,
    );
    expect(
      explainGrowthEvidence({ ...e, money: undefined }, ["RECORDED_REVENUE"]),
    ).toMatch(/No tienes acceso financiero/);
  });
  it("does not infer low occupancy or a recovery outcome from incomplete capacity or retention data", () => {
    const e = {
      period: {
        days: 28,
        start: "2026-09-24",
        end: "2026-10-22",
        timezone: "UTC",
      },
      occupancy: { complete: false, percent: null },
    } as GrowthEvidence;
    expect(explainGrowthEvidence(e, ["OCCUPANCY"])).toMatch(
      /no puede determinarse/,
    );
    const retained = {
      period: {
        days: 28,
        start: "2026-09-24",
        end: "2026-10-22",
        timezone: "UTC",
      },
      retention: {
        currentClients: 0,
        newClients: 0,
        repeatClients: 0,
        previousClients: 0,
        retainedClients: 0,
      },
    } as GrowthEvidence;
    expect(explainGrowthEvidence(retained, ["RETENTION"])).toMatch(
      /De 0 clientes/,
    );
    expect(explainGrowthEvidence(retained, ["RETENTION"])).not.toMatch(
      /NaN|Infinity/,
    );
  });
  it("reduces free text to aggregate intents without forwarding incidental personal or clinical text", () => {
    const policy = growthInputPolicy(
      "Revisa la ocupación de Ana Pérez, ana@example.invalid, ficha clínica privada: SENTINEL.",
    );
    expect(JSON.parse(policy.modelMessage).metrics).toEqual(["OCCUPANCY"]);
    expect(policy.modelMessage).not.toMatch(
      /Ana|Pérez|example|clínica|SENTINEL/,
    );
    expect(policy.allowPrepare).toBe(false);
  });
  it("exposes preparation only for an explicit prepare intent and keeps explanation and unsupported actions read-only", () => {
    expect(growthInputPolicy("Prepárame una estrategia").allowPrepare).toBe(
      true,
    );
    expect(growthInputPolicy("No preparar una estrategia").allowPrepare).toBe(
      false,
    );
    expect(growthInputPolicy("Prepara y envía la campaña").allowPrepare).toBe(
      false,
    );
    expect(
      growthInputPolicy("Prepare", "authorized-recommendation").allowPrepare,
    ).toBe(false);
  });
});
