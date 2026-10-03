import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const file = "docs/seo/expansion-batch-01-baseline.json";
const roots = [
  "src/app/software-agenda-barberias", "src/app/software-agenda-peluquerias",
  "src/app/software-agenda-manicure", "src/app/software-agenda-estetica",
  "src/app/software-agenda-psicologos", "src/app/para", "src/app/soluciones",
  "src/components/landing", "src/components/i18n", "src/components/icons",
  "src/components/analytics", "src/i18n", "src/lib/data/industries.ts",
  "src/lib/data/barbershop-software-landing.ts", "src/lib/data/salon-software-landing.ts",
  "src/lib/data/manicure-software-landing.ts", "src/lib/data/aesthetics-software-landing.ts",
  "src/lib/data/psychologists-software-landing.ts", "src/lib/data/testimonials.ts",
  "src/lib/data/case-studies.ts", "src/lib/seo.ts", "src/lib/json-ld.ts",
  "src/lib/site.ts", "src/core/constants.ts", "src/app/layout.tsx", "src/app/globals.css",
  "src/lib/crawler-policy.ts", "docs/seo/vertical-performance-baseline.md",
  "docs/seo/vertical-expansion-priority.md",
];
export function sourceHash(path) {
  return createHash("sha256").update(readFileSync(path, "utf8").replace(/\r\n/g, "\n")).digest("hex");
}
if (process.argv.includes("--capture")) {
  if (existsSync(file)) throw new Error("Baseline already exists; never overwrite it after editing.");
  const paths = execFileSync("git", ["ls-files", "--", ...roots], { encoding: "utf8" }).trim().split(/\r?\n/);
  const snapshot = {
    capturedAt: "2026-10-03", base: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
    initialDiff: execFileSync("git", ["diff", "--", ...roots], { encoding: "utf8" }),
    hashes: Object.fromEntries(paths.map((path) => [path, sourceHash(path)])),
  };
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`Captured ${paths.length} protected source hashes at ${snapshot.base}`);
} else {
  const snapshot = JSON.parse(readFileSync(file, "utf8"));
  const changed = Object.keys(snapshot.hashes).filter((path) => sourceHash(path) !== snapshot.hashes[path]);
  if (changed.length) throw new Error(`Experiment changed: ${changed.join(", ")}`);
  console.log(`PASS: ${Object.keys(snapshot.hashes).length} protected files unchanged; initial diff empty: ${!snapshot.initialDiff}`);
}
