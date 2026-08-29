import { createHash } from "node:crypto";

export function normalizePrivacyEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPrivacyEmail(email: string) {
  return createHash("sha256").update(normalizePrivacyEmail(email)).digest("hex");
}
