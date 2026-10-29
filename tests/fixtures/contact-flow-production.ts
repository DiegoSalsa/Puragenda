import { vi } from "vitest";
import launchPolicy from "../../config/commercial/contact-flow-free.json";
import { productionResendBaseConfiguration, contactReleaseApprovalBindings, RESEND_CONTACT_EVENTS } from "@/server/contact-flow/resend-release";
export function configureProductionContactFlow(options: { enabled?: boolean; policy?: unknown } = {}) {
  const existingTokenSecret = process.env.CONTACT_FLOW_TOKEN_SECRET;
  vi.stubEnv("CONTACT_FLOW_EXTERNAL_RELEASE", "true");
  vi.stubEnv("RESEND_API_KEY", "re_synthetic_transactional");
  vi.stubEnv("CONTACT_FLOW_RESEND_API_KEY", "re_synthetic_lab");
  const policy = options.policy ?? structuredClone(launchPolicy);
  for (const [name,value] of Object.entries({ NODE_ENV:"production", VERCEL_ENV:"production", APP_URL:"https://www.puragenda.cl", PURAGENDA_NEXT_ENABLED:"1", CONTACT_FLOW_DELIVERY_MODE:"production", CONTACT_FLOW_PRODUCTION_ENABLED:options.enabled?"1":"0", CONTACT_FLOW_RESEND_TEST_ENABLED:"0", CONTACT_FLOW_RESEND_ISOLATED_ACCOUNT:"0", CONTACT_FLOW_PROVIDER_CAPACITY_MODE:"shared_free", CONTACT_FLOW_PRODUCTION_RESEND_API_KEY:"re_synthetic_production_sender", CONTACT_FLOW_PRODUCTION_RESEND_READ_API_KEY:"re_synthetic_production_reader", CONTACT_FLOW_PRODUCTION_RESEND_WEBHOOK_SECRET:"whsec_c3ludGhldGlj", CONTACT_FLOW_TOKEN_SECRET:"synthetic-production-token-secret-at-least-thirty-two", CONTACT_FLOW_PRODUCTION_DOMAIN_ID:"synthetic-domain", CONTACT_FLOW_PRODUCTION_WEBHOOK_ID:"synthetic-webhook", CONTACT_FLOW_PRODUCTION_FROM:"contacto@contacto.puragenda.cl", CONTACT_FLOW_PRODUCTION_REPLY_TO:"contacto@purocode.com", CONTACT_FLOW_PUBLIC_ORIGIN:"https://www.puragenda.cl", COMMERCIAL_WORKER_ENABLED:"1", COMMERCIAL_WORKER_KILLED:"0", COMMERCIAL_WORKER_SECRET:"synthetic-worker-secret-at-least-thirty-two-characters", COMMERCIAL_USAGE_POLICY_JSON:JSON.stringify(policy) })) vi.stubEnv(name,value);
  if (existingTokenSecret && existingTokenSecret.length >= 32) vi.stubEnv("CONTACT_FLOW_TOKEN_SECRET", existingTokenSecret);
  const config=productionResendBaseConfiguration();
  const approval={...contactReleaseApprovalBindings(config),permanentEndpointsVerified:true,replyToVerified:true,replyRoutingVerified:true,senderVerified:true,approvedBy:"synthetic-owner",approvalReference:"synthetic-shared-free-launch",approvedAt:new Date().toISOString()};
  vi.stubEnv("CONTACT_FLOW_PRODUCTION_APPROVAL_JSON",JSON.stringify(approval));
  return {config,approval,policy};
}
export function syntheticCapacityReader(used=0) {
  return {
    usage:vi.fn(async()=>({emails:{daily:{used,limit:100,resets_at:new Date(Date.now()+3600000).toISOString()},monthly:{used,limit:3000,resets_at:new Date(Date.now()+86400000).toISOString()}}})),
    domain:vi.fn(async()=>({name:"contacto.puragenda.cl",status:"verified"})),
    webhook:vi.fn(async()=>({endpoint:"https://www.puragenda.cl/api/contact-flow/webhooks/resend",status:"enabled",events:[...RESEND_CONTACT_EVENTS]})),
  };
}
