import { createHash, createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commercialHash } from "@/server/services/commercial-internal";
import { assertCertificationHeadroom } from "@/server/contact-flow/resend-certification";
import { resendTestConfiguration } from "@/server/contact-flow/resend-test";
import { receiveResendEvent } from "@/server/contact-flow/events";
import { prisma } from "@/server/db/prisma";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
function configure() {
  const now = new Date(), database = "postgresql://synthetic@127.0.0.1/puragenda_commercial_test_certification";
  const policy = { version: "LAB_ONLY", trial: {}, paid: {}, global: { contactFlow: { dailyLimit: 3, monthlyLimit: 3, contactDays: 30, senderEmail: "pruebas@contacto.puragenda.cl", emailEnabled: true, killed: false } } };
  const certificate = { version: 1, environment: "controlled-test", businessId: "lab", domainId: "lab-domain", sender: policy.global.contactFlow.senderEmail, origin: "https://lab.example.invalid", recipients: ["technical@example.invalid"], messageIds: ["approved-message"], credentialSha256: sha("re_synthetic_sender"), databaseSha256: sha(new URL(database).href), policySha256: commercialHash(policy), approvedBy: "synthetic-owner", approvalReference: "synthetic-certification", issuedAt: now.toISOString(), expiresAt: new Date(+now + 3600000).toISOString() };
  const env = { NODE_ENV: "test", VERCEL_ENV: "", DATABASE_URL: database, COMMERCIAL_V2_INTERNAL_WRITES: "1", PURAGENDA_NEXT_ENABLED: "1", CONTACT_FLOW_DELIVERY_MODE: "simulation", CONTACT_FLOW_RESEND_TEST_ENABLED: "1", CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT: "0", CONTACT_FLOW_RESEND_TEST_BUSINESS_ID: "lab", CONTACT_FLOW_RESEND_TEST_RECIPIENTS: JSON.stringify(certificate.recipients), CONTACT_FLOW_RESEND_FROM: certificate.sender, CONTACT_FLOW_RESEND_DOMAIN_ID: certificate.domainId, CONTACT_FLOW_PUBLIC_ORIGIN: certificate.origin, CONTACT_FLOW_RESEND_API_KEY: "re_synthetic_sender", CONTACT_FLOW_RESEND_READ_API_KEY: "re_synthetic_reader", CONTACT_FLOW_RESEND_WEBHOOK_SECRET: "whsec_c3ludGhldGlj", COMMERCIAL_USAGE_POLICY_JSON: JSON.stringify(policy), CONTACT_FLOW_RESEND_CERTIFICATION_JSON: JSON.stringify(certificate) };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return { certificate, policy };
}
describe("bounded shared-team Resend certification", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  it("admits only the configured isolated lab and keeps the shared-team identity explicit", () => {
    configure();
    const config = resendTestConfiguration();
    expect(config.certification?.messageIds).toEqual(["approved-message"]);
    expect(config.key).not.toBe(config.readKey);
    expect(process.env.CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT).toBe("0");
  });
  it("rejects a moved database, changed policy, reused key or missing certificate", () => {
    configure(); vi.stubEnv("DATABASE_URL", "postgresql://synthetic@127.0.0.1/puragenda_commercial_test_other");
    expect(() => resendTestConfiguration()).toThrow("CONTROLLED_CERTIFICATION_MISMATCH");
    const { policy } = configure(); vi.stubEnv("COMMERCIAL_USAGE_POLICY_JSON", JSON.stringify({ ...policy, version: "changed" }));
    expect(() => resendTestConfiguration()).toThrow("CONTROLLED_CERTIFICATION_MISMATCH");
    configure(); vi.stubEnv("CONTACT_FLOW_RESEND_READ_API_KEY", "re_synthetic_sender");
    expect(() => resendTestConfiguration()).toThrow("CONTROLLED_CERTIFICATION_MISMATCH");
    configure(); vi.stubEnv("CONTACT_FLOW_RESEND_CERTIFICATION_JSON", "");
    expect(() => resendTestConfiguration()).toThrow("COMMERCIAL_PROVIDER_ACCOUNT_SEPARATION_REQUIRED");
  });
  it("rejects expired, extended or enlarged authorizations", () => {
    const { certificate } = configure();
    for (const change of [{ expiresAt: new Date(Date.now() - 1).toISOString() }, { expiresAt: new Date(Date.now() + 3 * 3600000).toISOString() }, { messageIds: ["a", "b", "c", "d"] }, { recipients: ["other@example.invalid"] }]) {
      vi.stubEnv("CONTACT_FLOW_RESEND_CERTIFICATION_JSON", JSON.stringify({ ...certificate, ...change }));
      expect(() => resendTestConfiguration()).toThrow();
    }
  });
  it("cannot open a production runtime or enlarge the existing quota ledger", () => {
    configure(); vi.stubEnv("VERCEL_ENV", "production");
    expect(() => resendTestConfiguration()).toThrow("CONTROLLED_TEST_ENVIRONMENT_REQUIRED");
    const { policy, certificate } = configure(); policy.global.contactFlow.monthlyLimit = 4;
    vi.stubEnv("COMMERCIAL_USAGE_POLICY_JSON", JSON.stringify(policy));
    vi.stubEnv("CONTACT_FLOW_RESEND_CERTIFICATION_JSON", JSON.stringify({ ...certificate, policySha256: commercialHash(policy) }));
    expect(() => resendTestConfiguration()).toThrow("CONTROLLED_CERTIFICATION_MISMATCH");
  });
  it("reserves transactional headroom and refuses unknown provider capacity", () => {
    expect(() => assertCertificationHeadroom({ emails: { daily: { used: 79, limit: 100 }, monthly: { used: 2899, limit: 3000 } } })).not.toThrow();
    for (const usage of [null, { emails: { daily: { used: 80, limit: 100 }, monthly: { used: 0, limit: 3000 } } }, { emails: { daily: { used: 0, limit: 100 }, monthly: { used: 2900, limit: 3000 } } }]) expect(() => assertCertificationHeadroom(usage)).toThrow("TRANSACTIONAL_CAPACITY_RESERVED");
  });
  it("authenticates before discarding unrelated transactional events without accessing their data", async () => {
    configure();
    const secret = Buffer.from("synthetic-certification-signing-secret");
    vi.stubEnv("CONTACT_FLOW_RESEND_WEBHOOK_SECRET", "whsec_" + secret.toString("base64"));
    vi.stubEnv("CONTACT_FLOW_RESEND_TEST_ENABLED", "0");
    const transaction = vi.spyOn(prisma, "$transaction").mockRejectedValue(new Error("DATABASE_MUST_NOT_BE_TOUCHED"));
    const id = "synthetic-transactional-event", ts = String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: "unrelated-transactional-message", from: "Puragenda <reservas@puragenda.cl>" } });
    const headers = new Headers({ "svix-id": id, "svix-timestamp": ts, "svix-signature": "v1," + createHmac("sha256", secret).update(`${id}.${ts}.${raw}`).digest("base64") });
    await expect(receiveResendEvent(raw, headers)).resolves.toEqual({ ignored: true });
    headers.set("svix-signature", "v1," + Buffer.alloc(32).toString("base64"));
    await expect(receiveResendEvent(raw, headers)).rejects.toThrow();
    expect(transaction).not.toHaveBeenCalled();
  });
});
