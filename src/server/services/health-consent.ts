import { createHash } from "node:crypto";
import { HEALTH_CONSENT_VERSION } from "@/core/health-consent";
export function healthFormRevision(questions: readonly string[]) {
  return createHash("sha256").update(JSON.stringify({ version: HEALTH_CONSENT_VERSION, questions })).digest("hex");
}
