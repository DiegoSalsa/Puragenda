import approved from "../../../config/commercial/contact-flow-free.json";
import { commercialUsagePolicySchema } from "@/server/services/commercial-usage-policy";

/** Merge the approved Contact Flow allocation without replacing existing AI budgets. */
export function contactFlowFreeLaunchPolicy(existing?: unknown) {
  const previous = existing ? commercialUsagePolicySchema.parse(existing) : commercialUsagePolicySchema.parse({ version: approved.version, trial: {}, paid: {}, global: {} });
  return commercialUsagePolicySchema.parse({
    ...previous, version: `${previous.version}:CONTACT_FLOW_FREE_2026_10_28`,
    trial: { ...previous.trial, PURAGENDA_PLUS: { ...previous.trial.PURAGENDA_PLUS, puri: previous.trial.PURAGENDA_PLUS?.puri ?? approved.trial.PURAGENDA_PLUS.puri, contactFlow: approved.trial.PURAGENDA_PLUS.contactFlow } },
    paid: { ...previous.paid, PURAGENDA_PLUS: { ...previous.paid.PURAGENDA_PLUS, puri: previous.paid.PURAGENDA_PLUS?.puri ?? approved.paid.PURAGENDA_PLUS.puri, contactFlow: approved.paid.PURAGENDA_PLUS.contactFlow } },
    global: { ...previous.global, puri: previous.global.puri ?? approved.global.puri, contactFlow: approved.global.contactFlow },
  });
}
