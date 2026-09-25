import { beforeEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_PERMISSIONS as P } from "@/core/permissions";
import { PuriAccessError, type PuriContext } from "@/server/puri/types";

const mocks = vi.hoisted(() => ({ create: vi.fn(), execute: vi.fn() }));
vi.mock("@/server/puri/openai-client", () => ({ getPuriOpenAI: () => ({ responses: { create: mocks.create } }), PURI_MODEL: "gpt-6-luna" }));
vi.mock("@/server/puri/tools", () => ({ executePuriTool: mocks.execute, puriToolNames: ["getTodayOverview", "getRevenueSummary"] }));

import { answerWithPuri } from "@/server/puri/orchestrator";

const context = {
  user: { id: "user-1", role: "STAFF" },
  business: { id: "business-1", ownerId: "owner-1", name: "Test", slug: "test", timezone: "America/Santiago", currencyCode: "CLP" },
  permissions: [P.APPOINTMENTS_VIEW_OWN], staffId: "staff-1", canSeeAllAgendas: false, ownAgenda: true,
  location: { id: "location-1", slug: "main", name: "Main", timezone: "America/Santiago", isPrimary: true }, locationCount: 1,
  locale: "es", pathname: "/dashboard", selectedPeriod: "week",
} as PuriContext;

describe("Puri orchestration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("executes a controlled tool and builds cards from its verified result", async () => {
    mocks.create.mockResolvedValueOnce({ output: [{ type: "function_call", name: "getTodayOverview", arguments: "{}", call_id: "call-1" }] });
    mocks.create.mockResolvedValueOnce({ output: [], output_text: '{"message":"Tienes dos citas hoy."}' });
    mocks.execute.mockResolvedValue({ counts: { appointments: 2, openSlots: 1 }, canSeeMoney: false });
    const answer = await answerWithPuri({ context, message: "¿Qué tengo hoy?", history: [] });
    expect(answer).toMatchObject({ message: "Tienes dos citas hoy.", cards: [{ type: "metric", value: 2 }], actions: [{ id: "agenda" }] });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-6-luna", store: false, parallel_tool_calls: false, tool_choice: "required" }));
  });

  it("gives a permission response without exposing denied data", async () => {
    mocks.create.mockResolvedValueOnce({ output: [{ type: "function_call", name: "getRevenueSummary", arguments: '{"period":"today"}', call_id: "call-1" }] });
    mocks.create.mockResolvedValueOnce({ output: [], output_text: '{"message":"The business made 100000."}' });
    mocks.execute.mockRejectedValue(new PuriAccessError("FORBIDDEN"));
    const answer = await answerWithPuri({ context, message: "Ingresos", history: [] });
    expect(answer.cards).toEqual([]);
    expect(answer.message).toBe("No tienes acceso a esos datos.");
    expect(answer.message).not.toContain("100000");
  });

  it("never accepts a model-only answer without verified tool data", async () => {
    mocks.create.mockResolvedValue({ output: [], output_text: '{"message":"Invented fact"}' });
    const answer = await answerWithPuri({ context, message: "Ingresos", history: [] });
    expect(answer.message).not.toContain("Invented fact");
  });
});
