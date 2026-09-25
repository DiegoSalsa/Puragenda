import { describe, expect, it } from "vitest";
import { puriTools } from "@/server/puri/definitions";

describe("Puri tool contracts", () => {
  it("keeps every tool strict and free of arbitrary SQL inputs", () => {
    expect(puriTools.length).toBeGreaterThanOrEqual(14);
    for (const tool of puriTools) {
      expect(tool.type).toBe("function");
      expect(tool.strict).toBe(true);
      expect(tool.parameters).toMatchObject({ type: "object", additionalProperties: false });
    }
  });
});
