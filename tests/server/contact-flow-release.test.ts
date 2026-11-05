import { createHash } from "node:crypto";
import launchPolicy from "../../config/commercial/contact-flow-free.json";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureProductionContactFlow } from "../fixtures/contact-flow-production";
import { productionResendConfiguration, resendReleaseReadiness } from "@/server/contact-flow/resend-release";
import { resendTestConfiguration, contactProviderMode } from "@/server/contact-flow/resend-test";
describe("future Contact Flow release approval", () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each([
    ["0","false",false], ["0","true",false], ["1","false",false],
    ["1","true",true], ["true","true",false], ["1","1",false],
  ])("requires both explicit activation values (%s, %s)",(enabled,external,expected)=>{
    configureProductionContactFlow({enabled:true});
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_ENABLED",String(enabled));
    vi.stubEnv("CONTACT_FLOW_EXTERNAL_RELEASE",String(external));
    expect(resendReleaseReadiness()).toMatchObject({configurationValid:true,activationRequested:expected,deliveryEnabled:expected});
  });
  it("preflights shared Free while paused and activates reversibly only with the explicit switch", () => {
    configureProductionContactFlow();
    expect(productionResendConfiguration("pilot-a", false).businessIds).toBeNull();
    expect(resendReleaseReadiness()).toMatchObject({ configurationValid: true, activationRequested: false, deliveryEnabled: false });
    expect(() => productionResendConfiguration("pilot-a")).toThrow("CONTACT_FLOW_EXTERNAL_DELIVERY_BLOCKED");
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_ENABLED","1");
    expect(resendReleaseReadiness().deliveryEnabled).toBe(true);
    vi.stubEnv("COMMERCIAL_WORKER_KILLED","1");
    expect(resendReleaseReadiness().deliveryEnabled).toBe(false);
  });
  it("rejects altered policy, origin, reply-to, expired approval and transactional credentials", () => {
    const { approval, config, policy } = configureProductionContactFlow();
    vi.stubEnv("COMMERCIAL_USAGE_POLICY_JSON", JSON.stringify({ ...policy as object, version: "changed" }));
    expect(() => productionResendConfiguration("pilot-a", false)).toThrow("COMMERCIAL_RELEASE_APPROVAL_MISMATCH");
    configureProductionContactFlow(); vi.stubEnv("CONTACT_FLOW_PRODUCTION_APPROVAL_JSON", JSON.stringify({ ...approval, expiresAt: "2020-01-01T00:00:00Z" }));
    expect(() => productionResendConfiguration("pilot-a", false)).toThrow("COMMERCIAL_RELEASE_APPROVAL_MISMATCH");
    configureProductionContactFlow(); vi.stubEnv("RESEND_API_KEY", config.key);
    expect(() => productionResendConfiguration("pilot-a", false)).toThrow("COMMERCIAL_PROVIDER_CREDENTIAL_SEPARATION_REQUIRED");
    configureProductionContactFlow(); vi.stubEnv("CONTACT_FLOW_PRODUCTION_RESEND_READ_API_KEY", process.env.RESEND_API_KEY);
    expect(() => productionResendConfiguration("pilot-a", false)).toThrow("COMMERCIAL_PROVIDER_CREDENTIAL_SEPARATION_REQUIRED");
    configureProductionContactFlow(); vi.stubEnv("CONTACT_FLOW_PUBLIC_ORIGIN","https://synthetic.trycloudflare.com");
    expect(() => productionResendConfiguration(undefined,false)).toThrow("PERMANENT_CONTACT_ORIGIN_REQUIRED");
    configureProductionContactFlow(); vi.stubEnv("CONTACT_FLOW_PRODUCTION_REPLY_TO","other@puragenda.cl");
    expect(() => productionResendConfiguration(undefined,false)).toThrow("COMMERCIAL_RELEASE_APPROVAL_MISMATCH");
  });
  it("never allows the controlled test adapter in a production runtime", () => {
    configureProductionContactFlow(); vi.stubEnv("CONTACT_FLOW_RESEND_TEST_ENABLED", "1"); vi.stubEnv("PURAGENDA_NEXT_ENABLED", "1");
    expect(() => resendTestConfiguration()).toThrow("CONTROLLED_TEST_ENVIRONMENT_REQUIRED");
    expect(() => productionResendConfiguration(undefined, false)).toThrow("COMMERCIAL_PROVIDER_ENVIRONMENT_MISMATCH");
  });
  it("cannot fall back to simulation or enable delivery with a closed channel policy", () => {
    const policy=structuredClone(launchPolicy);
    policy.global.contactFlow.emailEnabled=false;configureProductionContactFlow({enabled:true,policy});
    expect(resendReleaseReadiness()).toMatchObject({configurationValid:true,deliveryEnabled:false});
    vi.stubEnv("CONTACT_FLOW_DELIVERY_MODE","simulation");expect(contactProviderMode("synthetic")).toBe("PRODUCTION_RESEND");
  });
  it("refuses release approval until shared-mailbox tenant routing has been verified",()=>{
    const {approval}=configureProductionContactFlow({enabled:true});
    vi.stubEnv("CONTACT_FLOW_PRODUCTION_APPROVAL_JSON",JSON.stringify({...approval,replyRoutingVerified:false}));
    expect(resendReleaseReadiness()).toMatchObject({configurationValid:false,deliveryEnabled:false});
  });
  it("keeps external delivery closed when the explicit external release is false or absent",()=>{
    configureProductionContactFlow({enabled:true});
    for(const value of ["false", ""]) {
      vi.stubEnv("CONTACT_FLOW_EXTERNAL_RELEASE",value);
      expect(resendReleaseReadiness().deliveryEnabled).toBe(false);
    }
  });
  it("allows a compiled preview only with the explicitly approved isolated database fingerprint", () => {
    const database = "postgresql://synthetic@db.qa.invalid/isolated_preview";
    for (const [name, value] of Object.entries({ NODE_ENV: "production", VERCEL_ENV: "preview", PURAGENDA_NEXT_ENABLED: "1", COMMERCIAL_V2_INTERNAL_WRITES: "1", COMMERCIAL_V2_PREVIEW_ENABLED: "1", COMMERCIAL_V2_PREVIEW_DATABASE_SHA256: createHash("sha256").update(new URL(database).href).digest("hex"), DATABASE_URL: database, CONTACT_FLOW_DELIVERY_MODE: "simulation", CONTACT_FLOW_RESEND_TEST_ENABLED: "1", CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT: "1", CONTACT_FLOW_RESEND_TEST_BUSINESS_ID: "synthetic-preview", CONTACT_FLOW_RESEND_TEST_RECIPIENTS: '["recipient@example.invalid"]', CONTACT_FLOW_RESEND_FROM: "sender@example.invalid", CONTACT_FLOW_RESEND_DOMAIN_ID: "synthetic", CONTACT_FLOW_RESEND_API_KEY: "re_synthetic", CONTACT_FLOW_RESEND_WEBHOOK_SECRET: "whsec_c3ludGhldGlj", CONTACT_FLOW_PUBLIC_ORIGIN: "https://preview.example.invalid" })) vi.stubEnv(name, value);
    expect(resendTestConfiguration().businessId).toBe("synthetic-preview");
    vi.stubEnv("COMMERCIAL_V2_PREVIEW_DATABASE_SHA256", "0".repeat(64));
    expect(() => resendTestConfiguration()).toThrow("COMMERCIAL_WRITES_DISABLED");
  });
});
