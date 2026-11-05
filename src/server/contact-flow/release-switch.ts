/** Explicit, server-only activation. Credentials alone never enable sending. */
export function contactFlowProductionRequested() {
  return process.env.CONTACT_FLOW_PRODUCTION_ENABLED === "1" && process.env.CONTACT_FLOW_EXTERNAL_RELEASE === "true";
}
