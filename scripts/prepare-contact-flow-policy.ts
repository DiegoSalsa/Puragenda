import { contactFlowFreeLaunchPolicy } from "../src/server/contact-flow/launch-policy";
try {
  const current = process.env.COMMERCIAL_USAGE_POLICY_JSON;
  console.log(JSON.stringify(contactFlowFreeLaunchPolicy(current ? JSON.parse(current) : undefined), null, 2));
} catch { console.error("CONTACT_FLOW_POLICY_MERGE_FAILED"); process.exitCode = 1; }
