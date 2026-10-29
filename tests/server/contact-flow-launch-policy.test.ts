import { describe, expect, it } from "vitest";
import { contactFlowFreeLaunchPolicy } from "@/server/contact-flow/launch-policy";
describe("approved Contact Flow Free allocations",()=>{
  it("installs only the approved mail allowances and bounded non-model analysis",()=>{
    const p=contactFlowFreeLaunchPolicy();
    expect(p.global.contactFlow).toMatchObject({dailyLimit:10,monthlyLimit:200});
    expect(p.trial.PURAGENDA_PLUS?.contactFlow).toMatchObject({dailyLimit:5,trialLimit:30,campaignsPerPeriod:1,maxContactsPerCampaign:30,contactDays:30});
    expect(p.paid.PURAGENDA_PLUS?.contactFlow).toMatchObject({dailyLimit:10,monthlyLimit:150,campaignsPerPeriod:3,maxContactsPerCampaign:50,contactDays:30});
    expect(p.trial.PURAGENDA?.contactFlow).toBeUndefined();
    expect(p.paid.PURAGENDA_PLUS?.puri?.PLUS_INTERACTIVE).toBeUndefined();
    expect(p.global.puri?.limitMicros).toBe(0);
  });
  it("preserves all previously configured AI budgets and basic plan allowances",()=>{
    const budget={limitMicros:25,limitUnits:9},previous={version:"existing-approved-policy",trial:{PURAGENDA:{puri:{ALL:budget}}},paid:{PURAGENDA_PLUS:{puri:{ALL:budget,PLUS_INTERACTIVE:budget}}},global:{puri:budget}};
    const p=contactFlowFreeLaunchPolicy(previous);
    expect(p.global.puri).toEqual(budget);expect(p.paid.PURAGENDA_PLUS?.puri).toEqual(previous.paid.PURAGENDA_PLUS.puri);expect(p.trial.PURAGENDA?.puri).toEqual(previous.trial.PURAGENDA.puri);
  });
});
