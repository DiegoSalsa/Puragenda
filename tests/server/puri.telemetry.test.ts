import { afterEach, describe, expect, it } from "vitest";
import { emptyPuriTelemetry, estimatePuriCostUsd, intentFromTools, requestStatus, toolFailureStatus, toolResultCount } from "@/server/puri/telemetry";

describe("Puri metadata classification", () => {
  afterEach(() => { delete process.env.PURI_MODEL_PRICES_USD_PER_MILLION; });

  it("classifies from the actual tool and preserves unknown", () => {
    const call = { toolName: "getAvailability", status: "SUCCESS" as const, durationMs: 20 };
    expect(intentFromTools([call], "¿Hay horas?")).toBe("disponibilidad");
    expect(intentFromTools([], "Hola")).toBe("unknown");
    expect(intentFromTools([call], "Cancela la cita")).toBe("ACTION_REQUEST_UNSUPPORTED");
  });

  it("normalizes structured tool outcomes without reading model text", () => {
    expect(toolResultCount("getAppointments", { appointments: [] })).toBe(0);
    expect(toolFailureStatus("LOCATION_FORBIDDEN")).toBe("INVALID_SCOPE");
    expect(toolFailureStatus("FORBIDDEN")).toBe("DENIED");
    expect(requestStatus([{ toolName: "getAppointments", status: "NO_DATA", durationMs: 1 }])).toBe("NO_DATA");
  });

  it("keeps cost unknown without a configured model price", () => {
    const usage = emptyPuriTelemetry("test-model");
    usage.promptTokens = 1000;
    usage.completionTokens = 200;
    expect(estimatePuriCostUsd(usage)).toBeNull();
    process.env.PURI_MODEL_PRICES_USD_PER_MILLION = JSON.stringify({ "test-model": { input: 2, output: 10 } });
    expect(estimatePuriCostUsd(usage)).toBeCloseTo(0.004);
  });
});
