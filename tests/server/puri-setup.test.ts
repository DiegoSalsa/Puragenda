import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSetupHours } from "@/core/onboarding";
import type { PuriContext } from "@/server/puri/types";
const mocks = vi.hoisted(() => ({ context: vi.fn(), load: vi.fn(), loop: vi.fn(), learning: vi.fn() }));
vi.mock("@/server/onboarding/service", async original => ({ ...await original<typeof import("@/server/onboarding/service")>(), setupContext: mocks.context, loadSetup: mocks.load }));
vi.mock("@/server/puri/orchestrator", () => ({ answerWithPuri: mocks.loop }));
vi.mock("@/server/puri/learning", () => ({ answerLearningQuestion: mocks.learning }));
import { answerSetupWithPuri } from "@/server/puri/setup";

const context = { user: { id: "owner", role: "ADMIN" }, business: { id: "business" }, commercialV2: true } as PuriContext;
const request = { context, setup: { step: "hours" as const, locationId: "location", revision: 3 }, message: "Ajusta mi atención habitual", history: [] };
describe("Puri Setup capability on the existing orchestrator", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("OPENAI_API_KEY", "");
    mocks.context.mockResolvedValue({ access: { allowed: true }, business: context.business });
    mocks.learning.mockResolvedValue(null);
    mocks.load.mockResolvedValue({ revision: 3, industry: "Estética", mode: "solo", capacity: { current: 1, total: 1 }, draft: {}, locations: [{ id: "location", hours: defaultSetupHours() }], staff: [{ id: "staff", name: "Antonia" }], catalog: { services: [] } });
  });
  it("returns a clearly identified deterministic proposal when no credentials are configured", async () => {
    const result = await answerSetupWithPuri({ ...request, message: "Lunes a viernes de 9 a 19 con colación de 13 a 14" });
    expect(result.setup?.mode).toBe("rules"); expect(result.setup?.proposal?.kind).toBe("hours"); expect(mocks.loop).not.toHaveBeenCalled();
  });
  it("does not pretend AI worked for an instruction the offline grammar cannot interpret", async () => {
    const result = await answerSetupWithPuri(request);
    expect(result.setup).toMatchObject({ mode: "rules", reason: "NOT_CONFIGURED" }); expect(result.setup?.proposal).toBeUndefined();
  });
  it("uses the shared tool loop and validates the proposed data without performing writes", async () => {
    vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder");
    mocks.loop.mockImplementation(async ({ extension }) => {
      expect(extension.tier).toBe("PURI_SETUP");
      expect(extension.tools[0]).toMatchObject({ name: "prepareSetupHours", strict: true });
      await extension.execute("prepareSetupHours", { hours: defaultSetupHours(), notes: [] });
      return { message: "Preparado", cards: [], actions: [], toolsUsed: ["prepareSetupHours"] };
    });
    const result = await answerSetupWithPuri(request);
    expect(result.setup).toMatchObject({ mode: "ai", proposal: { kind: "hours" } });
    expect(result.message).toContain("Guardar horarios");
  });
  it("recovers from provider outages and commercial quota errors with manual configuration available", async () => {
    vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder");
    mocks.loop.mockRejectedValueOnce(new Error("MODEL_TIMEOUT"));
    expect((await answerSetupWithPuri(request)).setup).toMatchObject({ mode: "rules", reason: "PROVIDER_UNAVAILABLE" });
    mocks.loop.mockRejectedValueOnce(new Error("BUDGET_EXHAUSTED"));
    expect((await answerSetupWithPuri(request)).setup).toMatchObject({ mode: "rules", reason: "USAGE_LIMIT" });
  });
  it("rejects cross-business references and stale editor revisions before invoking the model", async () => {
    await expect(answerSetupWithPuri({ ...request, setup: { ...request.setup, locationId: "foreign" } })).rejects.toMatchObject({ status: 403 });
    await expect(answerSetupWithPuri({ ...request, setup: { ...request.setup, revision: 2 } })).rejects.toMatchObject({ status: 409 });
    expect(mocks.loop).not.toHaveBeenCalled();
  });
  it("rejects model-invented service names even when the JSON schema is valid", async () => {
    vi.stubEnv("OPENAI_API_KEY", "unit-test-placeholder");
    mocks.loop.mockImplementation(async ({ extension }) => { await extension.execute("prepareServiceNames", { names: ["Un servicio nunca mencionado"] }); });
    const result = await answerSetupWithPuri({ ...request, setup: { ...request.setup, step: "services" }, message: "Ayúdame a organizar la carta habitual de mi negocio" });
    expect(result.setup?.mode).toBe("rules"); expect(result.setup?.proposal).toBeUndefined();
  });
});
