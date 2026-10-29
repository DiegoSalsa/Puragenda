import { resolveMx } from "node:dns/promises";
import { Resend } from "resend";
import { productionResendBaseConfiguration, contactReleaseApprovalBindings, RESEND_CONTACT_EVENTS } from "../src/server/contact-flow/resend-release";

// Read-only preflight. It never sends email, changes remote resources, writes an
// environment file, deploys, or purchases a plan. Supply environment server-side.
async function main() {
  const arg = (name: string) => process.argv.find(v => v.startsWith(`--${name}=`))?.slice(name.length + 3);
  const approvedBy = arg("approved-by"), approvalReference = arg("reference");
  if (!approvedBy || !approvalReference || !process.argv.includes("--reply-to-verified")) throw new Error("OWNER_REFERENCE_AND_VERIFIED_REPLY_TO_REQUIRED");
  if (!process.argv.includes("--reply-routing-verified")) throw new Error("SHARED_INBOX_TENANT_ROUTING_NOT_VERIFIED");
  const config = productionResendBaseConfiguration(), reader = new Resend(config.readKey);
  const [domain, webhook, mailboxMx, endpoint, optOut, restricted] = await Promise.all([
    reader.domains.get(config.domainId), reader.webhooks.get(config.webhookId), resolveMx(config.replyTo.split("@")[1]),
    fetch(config.origin + "/api/contact-flow/webhooks/resend", { method: "POST", body: "{}", signal: AbortSignal.timeout(10000), redirect: "error" }),
    fetch(config.origin + "/contact-flow/unsubscribe?token=invalid-preflight", { signal: AbortSignal.timeout(10000), redirect: "error" }),
    new Resend(config.key).domains.get(config.domainId),
  ]);
  if (!domain.data || domain.data.status !== "verified" || domain.data.name !== config.sender.split("@")[1] || !webhook.data || webhook.data.status !== "enabled" || webhook.data.endpoint !== config.origin + "/api/contact-flow/webhooks/resend" || webhook.data.signing_secret !== config.secret || RESEND_CONTACT_EVENTS.some(e => !webhook.data!.events?.includes(e))) throw new Error("PERMANENT_PROVIDER_CONFIGURATION_NOT_READY");
  if (!mailboxMx.length || endpoint.status !== 400 || optOut.status !== 200 || !(await optOut.text()).includes("Baja de comunicaciones comerciales") || restricted.data || restricted.error?.statusCode !== 403) throw new Error("PERMANENT_ENDPOINT_OR_SENDER_PERMISSION_NOT_READY");
  const approval = { ...contactReleaseApprovalBindings(config), permanentEndpointsVerified: true, replyToVerified: true, replyRoutingVerified: true, senderVerified: true, approvedBy, approvalReference, approvedAt: new Date().toISOString() };
  // Hashes and public settings only. No credentials or bearer links are emitted.
  console.log(JSON.stringify({ CONTACT_FLOW_PRODUCTION_APPROVAL_JSON: approval, activationApplied: false }, null, 2));
}
main().catch(error => { console.error(error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : "CONTACT_FLOW_PREFLIGHT_FAILED"); process.exitCode = 1; });
