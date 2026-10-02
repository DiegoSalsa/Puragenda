import type { BellaConfig } from "./config";

export function emptyProcessMoment(index: number): BellaConfig["process"][number] {
  return { image: "", title: `Momento ${index + 1}`, name: "", alt: "", category: "" };
}

/** Keep three upload positions available without adding example photos to the draft. */
export function editableProcess(process: BellaConfig["process"]) {
  return Array.from({ length: Math.max(3, process.length) }, (_, index) => process[index] ?? emptyProcessMoment(index));
}
